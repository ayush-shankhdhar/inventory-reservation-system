import { prisma } from '@/lib/db/prisma';
import { ProductCatalog } from '@/components/products/product-catalog';
import type { ProductDTO } from '@/types';

export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const search = params.search || '';
  const category = params.category || '';
  const page = parseInt(params.page || '1', 10);
  const pageSize = 12;

  const where: any = { isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;

  // Sequential to avoid connection pool exhaustion on Supabase free tier
  const products = await prisma.product.findMany({
    where,
    include: {
      inventories: { include: { warehouse: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const total = await prisma.product.count({ where });
  const warehouses = await prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });

  const serializedProducts: ProductDTO[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    description: p.description,
    image: p.image,
    category: p.category,
    price: p.price.toString(),
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    inventories: p.inventories.map((inv) => ({
      id: inv.id,
      productId: inv.productId,
      warehouseId: inv.warehouseId,
      totalStock: inv.totalStock,
      reservedStock: inv.reservedStock,
      availableStock: inv.totalStock - inv.reservedStock,
      reorderThreshold: inv.reorderThreshold,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
      warehouse: {
        id: inv.warehouse.id,
        name: inv.warehouse.name,
        code: inv.warehouse.code,
        city: inv.warehouse.city,
        address: inv.warehouse.address,
        isActive: inv.warehouse.isActive,
        createdAt: inv.warehouse.createdAt.toISOString(),
      },
    })),
  }));

  const warehousesList = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    code: w.code,
    city: w.city,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-1">
          Browse catalog and reserve inventory across warehouses
        </p>
      </div>
      <ProductCatalog
        products={serializedProducts}
        warehouses={warehousesList}
        total={total}
        page={page}
        pageSize={pageSize}
        search={search}
        category={category}
      />
    </div>
  );
}
