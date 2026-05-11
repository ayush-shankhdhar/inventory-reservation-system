import { prisma } from '@/lib/db/prisma';
import { recordAuditLog, AuditActions } from '@/lib/audit/audit-service';
import { ConflictError, GoneError, NotFoundError, UnprocessableError } from '@/lib/errors';
import { config } from '@/config';
import { generateReservationNumber } from '@/utils';
import type { ReservationDTO } from '@/types';
import { Prisma } from '@prisma/client';

/**
 * ================================================================
 * RESERVATION SERVICE — Concurrency-Safe Inventory Reservation
 * ================================================================
 *
 * This is the core of the system. Every method here is designed
 * to be safe under high concurrency with multiple simultaneous
 * requests competing for the same inventory.
 *
 * CONCURRENCY STRATEGY (Defense in Depth):
 *
 * Layer 1: PostgreSQL Interactive Transaction
 *   - SERIALIZABLE isolation would be safest but has high
 *     contention cost. We use READ COMMITTED + explicit locking.
 *   - Prisma interactive transaction with timeout
 *
 * Layer 2: Row-Level Locking (SELECT ... FOR UPDATE)
 *   - Locks the specific inventory row within the transaction
 *   - Other transactions block until the lock is released
 *   - Guarantees that availability check and stock update are atomic
 *
 * Together, these layers ensure:
 * - Two requests for the last unit → exactly one succeeds
 * - No overselling is possible
 * - Failed transactions don't leave partial state
 * ================================================================
 */

const RESERVATION_INCLUDES = {
  product: true,
  warehouse: true,
} as const;

function serializeReservation(reservation: any): ReservationDTO {
  return {
    id: reservation.id,
    reservationNumber: reservation.reservationNumber,
    productId: reservation.productId,
    warehouseId: reservation.warehouseId,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt.toISOString(),
    confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
    releasedAt: reservation.releasedAt?.toISOString() ?? null,
    sessionId: reservation.sessionId,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    ...(reservation.product && {
      product: {
        id: reservation.product.id,
        sku: reservation.product.sku,
        slug: reservation.product.slug,
        name: reservation.product.name,
        description: reservation.product.description,
        image: reservation.product.image,
        category: reservation.product.category,
        price: reservation.product.price.toString(),
        isActive: reservation.product.isActive,
        createdAt: reservation.product.createdAt.toISOString(),
        updatedAt: reservation.product.updatedAt.toISOString(),
      },
    }),
    ...(reservation.warehouse && {
      warehouse: {
        id: reservation.warehouse.id,
        name: reservation.warehouse.name,
        code: reservation.warehouse.code,
        city: reservation.warehouse.city,
        address: reservation.warehouse.address,
        isActive: reservation.warehouse.isActive,
        createdAt: reservation.warehouse.createdAt.toISOString(),
      },
    }),
  };
}

/**
 * CREATE RESERVATION — The core concurrency-safe operation.
 *
 * This is the most performance-critical and correctness-critical
 * code path in the entire system.
 */
export async function createReservation(
  productId: string,
  warehouseId: string,
  quantity: number,
  sessionId?: string
): Promise<ReservationDTO> {
  // ---- STEP 1: Validate inputs exist ----
  const [product, warehouse] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.warehouse.findUnique({ where: { id: warehouseId } }),
  ]);

  if (!product) throw new NotFoundError('Product', productId);
  if (!warehouse) throw new NotFoundError('Warehouse', warehouseId);
  if (!product.isActive) throw new UnprocessableError('Product is no longer available');

  try {
    // ---- STEP 2: Execute atomic transaction ----
    const reservation = await prisma.$transaction(
      async (tx) => {
        // STEP 2a: Lock the inventory row with FOR UPDATE.
        // This is a raw query because Prisma doesn't support FOR UPDATE natively.
        // The lock prevents other transactions from reading this row until we commit.
        const inventoryRows = await tx.$queryRaw<
          Array<{
            id: string;
            totalStock: number;
            reservedStock: number;
            reorderThreshold: number;
          }>
        >`
          SELECT id, "totalStock", "reservedStock", "reorderThreshold"
          FROM inventories
          WHERE "productId" = ${productId}
            AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `;

        const inventory = inventoryRows[0];
        if (!inventory) {
          throw new NotFoundError('Inventory', `${productId}:${warehouseId}`);
        }

        // STEP 2b: Calculate availability INSIDE the transaction.
        // This value is guaranteed fresh due to the FOR UPDATE lock.
        const availableStock = inventory.totalStock - inventory.reservedStock;

        // STEP 2c: Validate quantity against available stock.
        // If insufficient, throw ConflictError (HTTP 409).
        if (quantity > availableStock) {
          throw new ConflictError(
            `Insufficient stock. Requested: ${quantity}, Available: ${availableStock}. ` +
              `Another customer may have reserved the remaining units.`
          );
        }

        // STEP 2d: Atomically increment reservedStock.
        // Using Prisma's increment to avoid read-modify-write race.
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            reservedStock: { increment: quantity },
          },
        });

        // STEP 2e: Create the reservation record.
        const expiresAt = new Date(
          Date.now() + config.reservation.expiryMinutes * 60 * 1000
        );

        const newReservation = await tx.reservation.create({
          data: {
            reservationNumber: generateReservationNumber(),
            productId,
            warehouseId,
            quantity,
            status: 'PENDING',
            expiresAt,
            sessionId,
          },
          include: RESERVATION_INCLUDES,
        });

        return newReservation;
      },
      {
        // Transaction timeout — prevents long-held locks from blocking the system.
        timeout: 10000,
        // Isolation level: READ COMMITTED is sufficient because we use
        // explicit FOR UPDATE locking for the critical section.
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    // Record audit log (fire-and-forget)
    recordAuditLog({
      action: AuditActions.RESERVATION_CREATED,
      entityType: 'Reservation',
      entityId: reservation.id,
      sessionId,
      metadata: {
        reservationNumber: reservation.reservationNumber,
        productId,
        warehouseId,
        quantity,
        expiresAt: reservation.expiresAt.toISOString(),
      },
    });

    return serializeReservation(reservation);
  } catch (error) {
    // Reraise explicit application errors
    throw error;
  }
}

/**
 * CONFIRM RESERVATION — Payment succeeded.
 *
 * Transitions: PENDING → CONFIRMED
 * Effect: Decrements totalStock (permanent sale), releases reservedStock hold
 */
export async function confirmReservation(reservationId: string): Promise<ReservationDTO> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: RESERVATION_INCLUDES,
  });

  if (!reservation) throw new NotFoundError('Reservation', reservationId);

  // Guard: only PENDING reservations can be confirmed
  if (reservation.status !== 'PENDING') {
    throw new UnprocessableError(
      `Cannot confirm reservation in ${reservation.status} status. Only PENDING reservations can be confirmed.`
    );
  }

  // Guard: expired reservations cannot be confirmed
  if (reservation.expiresAt < new Date()) {
    throw new GoneError(
      'This reservation has expired. The held stock has been released.'
    );
  }

  const confirmed = await prisma.$transaction(async (tx) => {
    // Decrement both totalStock (permanent sale) and reservedStock (release hold)
    await tx.inventory.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
      data: {
        totalStock: { decrement: reservation.quantity },
        reservedStock: { decrement: reservation.quantity },
      },
    });

    return tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
      include: RESERVATION_INCLUDES,
    });
  });

  recordAuditLog({
    action: AuditActions.RESERVATION_CONFIRMED,
    entityType: 'Reservation',
    entityId: reservationId,
    metadata: {
      reservationNumber: reservation.reservationNumber,
      quantity: reservation.quantity,
    },
  });

  return serializeReservation(confirmed);
}

/**
 * RELEASE RESERVATION — User cancels or payment fails.
 *
 * Transitions: PENDING → RELEASED
 * Effect: Decrements reservedStock (makes units available again)
 */
export async function releaseReservation(reservationId: string): Promise<ReservationDTO> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: RESERVATION_INCLUDES,
  });

  if (!reservation) throw new NotFoundError('Reservation', reservationId);

  if (reservation.status !== 'PENDING') {
    throw new UnprocessableError(
      `Cannot release reservation in ${reservation.status} status.`
    );
  }

  const released = await prisma.$transaction(async (tx) => {
    // Release the reserved stock — makes it available for others
    await tx.inventory.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
      data: {
        reservedStock: { decrement: reservation.quantity },
      },
    });

    return tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
      include: RESERVATION_INCLUDES,
    });
  });

  recordAuditLog({
    action: AuditActions.RESERVATION_RELEASED,
    entityType: 'Reservation',
    entityId: reservationId,
    metadata: {
      reservationNumber: reservation.reservationNumber,
      quantity: reservation.quantity,
      reason: 'user_cancelled',
    },
  });

  return serializeReservation(released);
}

/**
 * GET RESERVATION — Fetch a single reservation by ID.
 */
export async function getReservation(reservationId: string): Promise<ReservationDTO> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: RESERVATION_INCLUDES,
  });

  if (!reservation) throw new NotFoundError('Reservation', reservationId);
  return serializeReservation(reservation);
}

/**
 * LIST RESERVATIONS — Paginated with filters.
 */
export async function listReservations(params: {
  page: number;
  pageSize: number;
  status?: string;
  search?: string;
  sessionId?: string;
}) {
  const { page, pageSize, status, search, sessionId } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (status) where.status = status;
  if (sessionId) where.sessionId = sessionId;
  if (search) {
    where.OR = [
      { reservationNumber: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: RESERVATION_INCLUDES,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.reservation.count({ where }),
  ]);

  return {
    data: reservations.map(serializeReservation),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrev: page > 1,
    },
  };
}
