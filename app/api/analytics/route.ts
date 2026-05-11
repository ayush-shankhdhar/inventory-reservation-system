import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getRecentAuditLogs } from '@/lib/audit/audit-service';
import { errorToResponse, successResponse } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateTraceId } from '@/utils';
import { cacheGet, cacheSet, CacheKeys } from '@/lib/redis/cache';
import type { DashboardStats } from '@/types';

/**
 * GET /api/analytics — Dashboard statistics.
 */
export async function GET(request: NextRequest) {
  const traceId = generateTraceId();

  try {
    await checkRateLimit(getClientIp(request), 'general');

    // Cache analytics for 30 seconds to reduce DB load
    const cached = await cacheGet<DashboardStats>(CacheKeys.analytics());
    if (cached) return successResponse(cached, traceId);

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
      prisma.reservation.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.inventory.findMany({
        select: { totalStock: true, reservedStock: true, reorderThreshold: true },
      }),
      getRecentAuditLogs(10),
    ]);

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

    await cacheSet(CacheKeys.analytics(), stats, 30);

    return successResponse(stats, traceId);
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}
