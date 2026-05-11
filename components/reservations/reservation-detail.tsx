'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Warehouse,
  Hash,
  Calendar,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCountdown } from '@/hooks/use-countdown';
import { confirmReservationAction, releaseReservationAction } from '@/actions/reservations';
import { formatCurrency, formatDate } from '@/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import type { ReservationDTO } from '@/types';

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'warning' as const, icon: Clock },
  CONFIRMED: { label: 'Confirmed', variant: 'success' as const, icon: CheckCircle2 },
  RELEASED: { label: 'Released', variant: 'info' as const, icon: XCircle },
  EXPIRED: { label: 'Expired', variant: 'destructive' as const, icon: AlertTriangle },
};

interface ReservationDetailProps {
  reservation: ReservationDTO;
}

export function ReservationDetail({ reservation }: ReservationDetailProps) {
  const router = useRouter();
  const [isConfirming, startConfirm] = useTransition();
  const [isReleasing, startRelease] = useTransition();
  const { formatted, percentage, isExpired, isUrgent, remaining } = useCountdown(
    reservation.expiresAt
  );

  const isPending = reservation.status === 'PENDING';
  const status = statusConfig[reservation.status];
  const StatusIcon = status.icon;
  const totalPrice = parseFloat(reservation.product?.price || '0') * reservation.quantity;

  const handleConfirm = () => {
    startConfirm(async () => {
      const result = await confirmReservationAction(reservation.id);
      if (result.success) {
        toast.success('Payment confirmed!', {
          description: 'Your reservation has been confirmed.',
        });
        router.refresh();
      } else {
        toast.error('Confirmation failed', { description: result.error });
      }
    });
  };

  const handleRelease = () => {
    startRelease(async () => {
      const result = await releaseReservationAction(reservation.id);
      if (result.success) {
        toast.success('Reservation cancelled', {
          description: 'Stock has been released back to inventory.',
        });
        router.refresh();
      } else {
        toast.error('Release failed', { description: result.error });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Button */}
      <Link
        href="/reservations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reservations
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Status Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <StatusIcon className="h-5 w-5" />
                <h1 className="text-xl font-bold">{reservation.reservationNumber}</h1>
              </div>
              <Badge variant={status.variant} className="text-sm">
                {status.label}
              </Badge>
            </div>

            {/* Countdown Timer — only for PENDING */}
            {isPending && !isExpired && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Time Remaining</span>
                  <span
                    className={`font-mono text-2xl font-bold ${
                      isUrgent ? 'text-red-500' : ''
                    }`}
                  >
                    {formatted}
                  </span>
                </div>
                <Progress
                  value={percentage}
                  className="h-2"
                  indicatorClassName={
                    isUrgent
                      ? 'bg-red-500'
                      : percentage < 50
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {isUrgent
                    ? 'Hurry! Your reservation is about to expire.'
                    : 'Complete payment to confirm your reservation.'}
                </p>
              </div>
            )}

            {isPending && isExpired && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  This reservation has expired. Stock has been released.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-14 w-14 rounded-lg bg-black relative overflow-hidden flex items-center justify-center shrink-0">
                {reservation.product?.image ? (
                  <Image
                    src={reservation.product.image}
                    alt={reservation.product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Package className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{reservation.product?.name}</p>
                <p className="text-sm text-muted-foreground">
                  SKU: {reservation.product?.sku}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(totalPrice)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(reservation.product?.price || '0')} × {reservation.quantity}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Warehouse className="h-3.5 w-3.5" />
                  <span className="text-xs">Warehouse</span>
                </div>
                <p className="text-sm font-medium">{reservation.warehouse?.name}</p>
                <p className="text-xs text-muted-foreground">{reservation.warehouse?.city}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  <span className="text-xs">Quantity</span>
                </div>
                <p className="text-sm font-medium">{reservation.quantity} units</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs">Created</span>
                </div>
                <p className="text-sm font-medium">{formatDate(reservation.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">Expires</span>
                </div>
                <p className="text-sm font-medium">{formatDate(reservation.expiresAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {isPending && !isExpired && (
          <div className="flex gap-3">
            <Button
              onClick={handleRelease}
              variant="outline"
              className="flex-1"
              disabled={isReleasing || isConfirming}
            >
              {isReleasing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Cancel Reservation
                </>
              )}
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
              disabled={isConfirming || isReleasing}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Payment ({formatCurrency(totalPrice)})
                </>
              )}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
