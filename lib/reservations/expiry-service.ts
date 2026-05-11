import { prisma } from '@/lib/db/prisma';
import { recordAuditLogBatch, AuditActions } from '@/lib/audit/audit-service';
import { cacheDeletePattern } from '@/lib/redis/cache';

/**
 * Expiry Service — Automatic reservation cleanup.
 *
 * Processes expired PENDING reservations in batch:
 * 1. Finds all PENDING reservations where expiresAt < now
 * 2. For each: releases reservedStock and marks as EXPIRED
 * 3. Records audit logs for all expirations
 *
 * This runs via:
 * - Vercel Cron Job (production): every 1 minute
 * - Manual script (development): on-demand
 *
 * CONSISTENCY NOTE: Each reservation is expired in its own
 * transaction to prevent a single failure from blocking the
 * entire batch. This is a deliberate tradeoff — we accept
 * slightly longer processing time for better fault isolation.
 */

interface ExpiryResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ reservationId: string; error: string }>;
}

/**
 * Process all expired reservations and release their held stock.
 */
export async function processExpiredReservations(): Promise<ExpiryResult> {
  const result: ExpiryResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  // Find all expired PENDING reservations
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    select: {
      id: true,
      reservationNumber: true,
      productId: true,
      warehouseId: true,
      quantity: true,
    },
    // Process in batches to avoid memory issues with large backlogs
    take: 100,
  });

  if (expiredReservations.length === 0) {
    return result;
  }

  result.processed = expiredReservations.length;

  const auditEntries: Array<{
    action: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
  }> = [];

  // Process each expiration independently for fault isolation
  for (const reservation of expiredReservations) {
    try {
      await prisma.$transaction(async (tx) => {
        // Release the reserved stock
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

        // Mark reservation as EXPIRED
        await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'EXPIRED',
            releasedAt: new Date(),
          },
        });
      });

      result.succeeded++;
      auditEntries.push({
        action: AuditActions.RESERVATION_EXPIRED,
        entityType: 'Reservation',
        entityId: reservation.id,
        metadata: {
          reservationNumber: reservation.reservationNumber,
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
          quantity: reservation.quantity,
        },
      });
    } catch (error: any) {
      result.failed++;
      result.errors.push({
        reservationId: reservation.id,
        error: error.message ?? 'Unknown error',
      });
      console.error(
        `[ExpiryService] Failed to expire reservation ${reservation.id}:`,
        error
      );
    }
  }

  // Batch audit log write (non-blocking)
  if (auditEntries.length > 0) {
    recordAuditLogBatch(auditEntries).catch(() => {});
  }

  // Invalidate product/inventory caches
  cacheDeletePattern('products:*').catch(() => {});
  cacheDeletePattern('inventory:*').catch(() => {});

  console.log(
    `[ExpiryService] Processed ${result.processed} expired reservations: ` +
      `${result.succeeded} succeeded, ${result.failed} failed`
  );

  return result;
}
