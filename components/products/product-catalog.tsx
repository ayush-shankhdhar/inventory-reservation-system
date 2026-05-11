'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Search, Package, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReserveModal } from '@/components/products/reserve-modal';
import { formatCurrency, getStockStatus } from '@/utils';
import type { ProductDTO, InventoryDTO } from '@/types';

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'CLOTHING', label: 'Clothing' },
  { value: 'HOME', label: 'Home' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'ACCESSORIES', label: 'Accessories' },
  { value: 'BEAUTY', label: 'Beauty' },
  { value: 'FOOD', label: 'Food' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

interface ProductCatalogProps {
  products: ProductDTO[];
  warehouses: { id: string; name: string; code: string; city: string }[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  category: string;
}

export function ProductCatalog({
  products,
  warehouses,
  total,
  page,
  pageSize,
  search,
  category,
}: ProductCatalogProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search);
  const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const totalPages = Math.ceil(total / pageSize);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (key === 'search') {
      if (value) params.set('search', value);
      if (category) params.set('category', category);
    } else if (key === 'category') {
      if (search) params.set('search', search);
      if (value) params.set('category', value);
    } else if (key === 'page') {
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      params.set('page', value);
    }
    router.push(`/products?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters('search', searchValue);
  };

  const getTotalAvailable = (inventories?: InventoryDTO[]) =>
    inventories?.reduce((sum, inv) => sum + inv.availableStock, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </form>
        <Select
          value={category}
          onValueChange={(val) => updateFilters('category', val)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value || '_all'}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No products found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {products.map((product) => {
            const totalAvailable = getTotalAvailable(product.inventories);
            const hasLowStock = product.inventories?.some(
              (inv) => inv.availableStock > 0 && inv.availableStock <= inv.reorderThreshold
            );

            return (
              <motion.div key={product.id} variants={itemVariants}>
                <Card className="group hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
                  {/* Image placeholder */}
                  <div className="aspect-[4/3] bg-black rounded-t-xl flex items-center justify-center relative overflow-hidden border-b border-border/5">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground/40" />
                    )}
                    {/* Stock Badge */}
                    <div className="absolute top-3 right-3">
                      {totalAvailable <= 0 ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : hasLowStock ? (
                        <Badge variant="warning">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )}
                    </div>
                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {product.category}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{product.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">SKU: {product.sku}</p>
                      </div>
                      <span className="text-lg font-bold whitespace-nowrap">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {product.description}
                      </p>
                    )}

                    {/* Warehouse Stock */}
                    <div className="space-y-1.5 mb-4 flex-1">
                      {product.inventories?.map((inv) => {
                        const status = getStockStatus(
                          inv.totalStock,
                          inv.reservedStock,
                          inv.reorderThreshold
                        );
                        return (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-muted-foreground truncate">
                              {inv.warehouse?.name}
                            </span>
                            <span
                              className={
                                status.color === 'destructive'
                                  ? 'text-red-500'
                                  : status.color === 'warning'
                                  ? 'text-amber-500'
                                  : 'text-emerald-500'
                              }
                            >
                              {status.available} available
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      className="w-full"
                      disabled={totalAvailable <= 0}
                      onClick={() => {
                        setSelectedProduct(product);
                        setReserveOpen(true);
                      }}
                    >
                      {totalAvailable <= 0 ? 'Out of Stock' : 'Reserve Now'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
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

      {/* Reserve Modal */}
      {selectedProduct && (
        <ReserveModal
          product={selectedProduct}
          open={reserveOpen}
          onOpenChange={setReserveOpen}
        />
      )}
    </div>
  );
}
