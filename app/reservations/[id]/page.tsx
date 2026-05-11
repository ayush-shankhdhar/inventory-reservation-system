import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import { ReservationDetail } from '@/components/reservations/reservation-detail';

export const dynamic = 'force-dynamic';

interface ReservationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservationPage({ params }: ReservationPageProps) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: true, warehouse: true },
  });

  if (!reservation) notFound();

  const serialized = {
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
    warehouse: {
      id: reservation.warehouse.id,
      name: reservation.warehouse.name,
      code: reservation.warehouse.code,
      city: reservation.warehouse.city,
      address: reservation.warehouse.address,
      isActive: reservation.warehouse.isActive,
      createdAt: reservation.warehouse.createdAt.toISOString(),
    },
  };

  return <ReservationDetail reservation={serialized} />;
}
