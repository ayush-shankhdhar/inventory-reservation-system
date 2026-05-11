'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createReservationAction } from '@/actions/reservations';
import { formatCurrency, getStockStatus } from '@/utils';
import { Loader2, Warehouse, Package, AlertCircle } from 'lucide-react';
import type { ProductDTO } from '@/types';

interface ReserveModalProps {
  product: ProductDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReserveModal({ product, open, onOpenChange }: ReserveModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  const selectedInventory = product.inventories?.find(
    (inv) => inv.warehouseId === selectedWarehouse
  );
  const availableStock = selectedInventory
    ? selectedInventory.availableStock
    : 0;

  const handleReserve = () => {
    if (!selectedWarehouse) {
      toast.error('Please select a warehouse');
      return;
    }
    if (quantity < 1 || quantity > availableStock) {
      toast.error(`Quantity must be between 1 and ${availableStock}`);
      return;
    }

    startTransition(async () => {
      const result = await createReservationAction(
        product.id,
        selectedWarehouse,
        quantity
      );

      if (result.success && result.data) {
        toast.success('Reservation created!', {
          description: `${product.name} × ${quantity} reserved for 10 minutes`,
        });
        onOpenChange(false);
        router.push(`/reservations/${result.data.id}`);
      } else {
        toast.error('Reservation failed', {
          description: result.error || 'Please try again',
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Reserve Product
          </DialogTitle>
          <DialogDescription>
            Select a warehouse and quantity to reserve {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Product Summary */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
            </div>
            <span className="font-bold">{formatCurrency(product.price)}</span>
          </div>

          {/* Warehouse Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Warehouse</label>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger>
                <Warehouse className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {product.inventories?.map((inv) => {
                  const status = getStockStatus(
                    inv.totalStock,
                    inv.reservedStock,
                    inv.reorderThreshold
                  );
                  return (
                    <SelectItem
                      key={inv.warehouseId}
                      value={inv.warehouseId}
                      disabled={status.available <= 0}
                    >
                      <span className="flex items-center gap-2">
                        {inv.warehouse?.name} — {status.available} available
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          {selectedWarehouse && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Quantity (max {availableStock})
              </label>
              <Input
                type="number"
                min={1}
                max={Math.min(availableStock, 10)}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
              {availableStock <= 5 && availableStock > 0 && (
                <div className="flex items-center gap-1.5 text-amber-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="text-xs">Only {availableStock} units remaining</span>
                </div>
              )}
            </div>
          )}

          {/* Reservation Info */}
          {selectedWarehouse && (
            <div className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item Price</span>
                <span>{formatCurrency(product.price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <span>×{quantity}</span>
              </div>
              <div className="border-t pt-1.5 flex justify-between text-sm font-medium">
                <span>Total</span>
                <span>{formatCurrency(parseFloat(product.price) * quantity)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Stock will be held for 10 minutes. Confirm payment to complete the purchase.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReserve}
            disabled={isPending || !selectedWarehouse || quantity < 1}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Reserving...
              </>
            ) : (
              'Reserve Now'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
