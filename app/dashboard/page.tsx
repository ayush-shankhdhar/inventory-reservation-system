import { prisma } from '@/lib/db/prisma';
import { getRecentAuditLogs } from '@/lib/audit/audit-service';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    totalWarehouses,
    activeReservations,
    confirmedToday,
    expiredToday,
    reservationsByStatus,
    inventories,
    recentActivity,
    recentReservations,
  ] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.warehouse.count({ where: { isActive: true } }),
    prisma.reservation.count({ where: { status: 'PENDING' } }),
    prisma.reservation.count({
      where: { status: 'CONFIRMED', confirmedAt: { gte: today } },
    }),
    prisma.reservation.count({
      where: { status: 'EXPIRED', releasedAt: { gte: today } },
    }),
    prisma.reservation.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.inventory.findMany({
      select: { totalStock: true, reservedStock: true, reorderThreshold: true },
    }),
    getRecentAuditLogs(8),
    prisma.reservation.findMany({
      where: { status: 'PENDING' },
      include: { product: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const lowStockCount = inventories.filter(
    (inv) => inv.totalStock - inv.reservedStock <= inv.reorderThreshold
  ).length;

  const stats = {
    totalProducts,
    totalWarehouses,
    activeReservations,
    confirmedToday,
    expiredToday,
    lowStockCount,
    totalStockValue: inventories.reduce((sum, inv) => sum + inv.totalStock, 0),
    reservationsByStatus: reservationsByStatus.map((r) => ({
      status: r.status,
      count: r._count.id,
    })),
    recentActivity,
  };

  const activeReservationsList = recentReservations.map((r) => ({
    id: r.id,
    reservationNumber: r.reservationNumber,
    productName: r.product.name,
    warehouseName: r.warehouse.name,
    quantity: r.quantity,
    expiresAt: r.expiresAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Real-time overview of inventory and reservations
        </p>
      </div>
      <DashboardClient stats={stats} activeReservations={activeReservationsList} />
    </div>
  );
}
