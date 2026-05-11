import { prisma } from '@/lib/db/prisma';
import { ReservationsClient } from '@/components/reservations/reservations-client';

export const dynamic = 'force-dynamic';

interface ReservationsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function ReservationsPage({ searchParams }: ReservationsPageProps) {
  const params = await searchParams;
  const status = params.status || '';
  const search = params.search || '';
  const page = parseInt(params.page || '1', 10);
  const pageSize = 12;

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { reservationNumber: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // Sequential to avoid connection pool exhaustion on Supabase free tier
  const reservations = await prisma.reservation.findMany({
    where,
    include: { product: true, warehouse: true },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const total = await prisma.reservation.count({ where });

  const serialized = reservations.map((r) => ({
    id: r.id,
    reservationNumber: r.reservationNumber,
    productId: r.productId,
    warehouseId: r.warehouseId,
    quantity: r.quantity,
    status: r.status,
    expiresAt: r.expiresAt.toISOString(),
    confirmedAt: r.confirmedAt?.toISOString() ?? null,
    releasedAt: r.releasedAt?.toISOString() ?? null,
    sessionId: r.sessionId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    product: {
      id: r.product.id,
      sku: r.product.sku,
      slug: r.product.slug,
      name: r.product.name,
      description: r.product.description,
      image: r.product.image,
      category: r.product.category,
      price: r.product.price.toString(),
      isActive: r.product.isActive,
      createdAt: r.product.createdAt.toISOString(),
      updatedAt: r.product.updatedAt.toISOString(),
    },
    warehouse: {
      id: r.warehouse.id,
      name: r.warehouse.name,
      code: r.warehouse.code,
      city: r.warehouse.city,
      address: r.warehouse.address,
      isActive: r.warehouse.isActive,
      createdAt: r.warehouse.createdAt.toISOString(),
    },
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all inventory reservations
        </p>
      </div>
      <ReservationsClient
        reservations={serialized}
        total={total}
        page={page}
        pageSize={pageSize}
        status={status}
        search={search}
      />
    </div>
  );
}
