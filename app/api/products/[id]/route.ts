import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { errorToResponse, successResponse, NotFoundError } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateTraceId } from '@/utils';

/**
 * GET /api/products/:id — Single product with all warehouse inventory.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = generateTraceId();

  try {
    await checkRateLimit(getClientIp(request), 'general');

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        inventories: {
          include: { warehouse: true },
          orderBy: { warehouse: { name: 'asc' } },
        },
      },
    });

    if (!product) throw new NotFoundError('Product', id);

    const data = {
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      description: product.description,
      image: product.image,
      category: product.category,
      price: product.price.toString(),
      isActive: product.isActive,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      inventories: product.inventories.map((inv) => ({
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
    };

    return successResponse(data, traceId);
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}
