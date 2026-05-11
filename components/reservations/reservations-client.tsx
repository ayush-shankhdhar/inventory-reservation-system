'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, ClipboardList, Filter, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils';
import { useCountdown } from '@/hooks/use-countdown';
import type { ReservationDTO } from '@/types';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'EXPIRED', label: 'Expired' },
];

const statusBadgeVariant: Record<string, 'warning' | 'success' | 'info' | 'destructive' | 'secondary'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  RELEASED: 'info',
  EXPIRED: 'destructive',
};

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const { formatted, isExpired, isUrgent } = useCountdown(expiresAt);
  if (isExpired) return null;
  return (
    <Badge variant={isUrgent ? 'destructive' : 'secondary'} className="font-mono text-xs">
      {formatted}
    </Badge>
  );
}

interface ReservationsClientProps {
  reservations: ReservationDTO[];
  total: number;
  page: number;
  pageSize: number;
  status: string;
  search: string;
}

export function ReservationsClient({
  reservations,
  total,
  page,
  pageSize,
  status,
  search,
}: ReservationsClientProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search);
  const totalPages = Math.ceil(total / pageSize);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams();
    const currentSearch = key === 'search' ? value : search;
    const currentStatus = key === 'status' ? value : status;
    if (currentSearch) params.set('search', currentSearch);
    if (currentStatus) params.set('status', currentStatus);
    if (key === 'page') params.set('page', value);
    router.push(`/reservations?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters('search', searchValue);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reservation number or product..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </form>
        <Select
          value={status}
          onValueChange={(val) => updateFilters('status', val === '_all' ? '' : val)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value || '_all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reservation List */}
      {reservations.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No reservations found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Create a reservation from the products page
          </p>
          <Link href="/products">
            <Button className="mt-4" variant="outline">
              Browse Products
            </Button>
          </Link>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {reservations.map((reservation) => (
            <Card key={reservation.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">
                        {reservation.reservationNumber}
                      </span>
                      <Badge variant={statusBadgeVariant[reservation.status]}>
                        {reservation.status}
                      </Badge>
                      {reservation.status === 'PENDING' && (
                        <CountdownBadge expiresAt={reservation.expiresAt} />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {reservation.product?.name} × {reservation.quantity} —{' '}
                      {reservation.warehouse?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(reservation.createdAt)}
                      {reservation.product &&
                        ` · ${formatCurrency(
                          parseFloat(reservation.product.price) * reservation.quantity
                        )}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/reservations/${reservation.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateFilters('page', String(page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateFilters('page', String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
