import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { errorToResponse, successResponse } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateQuery, productQuerySchema } from '@/validators';
import { generateTraceId } from '@/utils';
import { hashPayload } from '@/utils';
import type { ProductDTO, ResponseMeta } from '@/types';

/**
 * GET /api/products — Paginated product catalog with search and filters.
 */
export async function GET(request: NextRequest) {
  const traceId = generateTraceId();

  try {
    await checkRateLimit(getClientIp(request), 'general');

    const params = validateQuery(request.nextUrl.searchParams, productQuerySchema);
    const { page, pageSize, search, category, inStock } = params;

    const skip = (page - 1) * pageSize;
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          inventories: {
            include: { warehouse: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    let data: ProductDTO[] = products.map((p) => ({
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

    // Filter in-stock after fetch (Prisma can't filter on computed fields)
    if (inStock) {
      data = data.filter((p) =>
        p.inventories?.some((inv) => inv.availableStock > 0)
      );
    }

    const meta: ResponseMeta = {
      page,
      pageSize,
      total: inStock ? data.length : total,
      totalPages: Math.ceil((inStock ? data.length : total) / pageSize),
      hasNext: page * pageSize < total,
      hasPrev: page > 1,
    };

    return successResponse(data, traceId, 200, meta as any);
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}
