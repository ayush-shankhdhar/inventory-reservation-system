'use client';

import { motion } from 'framer-motion';
import {
  Package,
  Warehouse,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/utils';
import { useCountdown } from '@/hooks/use-countdown';
import Link from 'next/link';
import type { DashboardStats, AuditLogDTO } from '@/types';

interface DashboardClientProps {
  stats: DashboardStats;
  activeReservations: Array<{
    id: string;
    reservationNumber: string;
    productName: string;
    warehouseName: string;
    quantity: number;
    expiresAt: string;
    createdAt: string;
  }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ActiveReservationRow({
  reservation,
}: {
  reservation: DashboardClientProps['activeReservations'][0];
}) {
  const { formatted, isUrgent, isExpired } = useCountdown(reservation.expiresAt);

  return (
    <Link
      href={`/reservations/${reservation.id}`}
      className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{reservation.productName}</p>
        <p className="text-xs text-muted-foreground">
          {reservation.reservationNumber} · {reservation.warehouseName} · Qty: {reservation.quantity}
        </p>
      </div>
      <Badge 
        variant={isExpired ? 'destructive' : isUrgent ? 'warning' : 'secondary'}
        suppressHydrationWarning
      >
        {isExpired ? 'Expired' : formatted}
      </Badge>
    </Link>
  );
}

function ReservationChart({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-500',
    CONFIRMED: 'bg-emerald-500',
    RELEASED: 'bg-blue-500',
    EXPIRED: 'bg-red-500',
  };

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.status} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground capitalize">{item.status.toLowerCase()}</span>
            <span className="font-medium">{item.count}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${statusColors[item.status] || 'bg-primary'}`}
              initial={{ width: 0 }}
              animate={{ width: `${(item.count / total) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardClient({ stats, activeReservations }: DashboardClientProps) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          description="Active catalog items"
        />
        <StatCard
          title="Active Reservations"
          value={stats.activeReservations}
          icon={Clock}
          description="Currently held"
        />
        <StatCard
          title="Confirmed Today"
          value={stats.confirmedToday}
          icon={CheckCircle2}
          description="Successful payments"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          description="Below reorder threshold"
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Warehouses"
          value={stats.totalWarehouses}
          icon={Warehouse}
        />
        <StatCard
          title="Total Stock Units"
          value={stats.totalStockValue}
          icon={TrendingUp}
        />
        <StatCard
          title="Expired Today"
          value={stats.expiredToday}
          icon={XCircle}
          description="Auto-released"
        />
        <StatCard
          title="System Activity"
          value={stats.recentActivity.length}
          icon={Activity}
          description="Recent events"
        />
      </div>

      {/* Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservation Distribution */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reservation Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ReservationChart data={stats.reservationsByStatus} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Reservations */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Active Reservations</CardTitle>
              <Link href="/reservations?status=PENDING">
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                  View All
                </Badge>
              </Link>
            </CardHeader>
            <CardContent>
              {activeReservations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No active reservations
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {activeReservations.map((r) => (
                    <ActiveReservationRow key={r.id} reservation={r} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 text-sm py-2"
                    >
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <span className="font-medium min-w-0 truncate">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-muted-foreground truncate">
                        {log.entityType} #{log.entityId.slice(-6)}
                      </span>
                      <span className="text-muted-foreground text-xs ml-auto shrink-0">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
