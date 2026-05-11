import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getRecentAuditLogs } from '@/lib/audit/audit-service';
import { errorToResponse, successResponse } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateTraceId } from '@/utils';
import type { DashboardStats } from '@/types';

/**
 * GET /api/analytics — Dashboard statistics.
 */
export async function GET(request: NextRequest) {
  const traceId = generateTraceId();

  try {
    await checkRateLimit(getClientIp(request), 'general');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sequential queries to stay within Supabase connection limits
    const totalProducts = await prisma.product.count({ where: { isActive: true } });
    const totalWarehouses = await prisma.warehouse.count({ where: { isActive: true } });
    const activeReservations = await prisma.reservation.count({ where: { status: 'PENDING' } });
    const confirmedToday = await prisma.reservation.count({
      where: { status: 'CONFIRMED', confirmedAt: { gte: today } },
    });
    const expiredToday = await prisma.reservation.count({
      where: { status: 'EXPIRED', releasedAt: { gte: today } },
    });
    const reservationsByStatus = await prisma.reservation.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const inventories = await prisma.inventory.findMany({
      select: { totalStock: true, reservedStock: true, reorderThreshold: true },
    });
    const recentActivity = await getRecentAuditLogs(10);

    const lowStockCount = inventories.filter(
      (inv) => inv.totalStock - inv.reservedStock <= inv.reorderThreshold
    ).length;

    const stats: DashboardStats = {
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

    return successResponse(stats, traceId);
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}
