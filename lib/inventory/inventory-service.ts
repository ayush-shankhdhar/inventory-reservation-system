import { prisma } from '@/lib/db/prisma';
import { NotFoundError } from '@/lib/errors';
import { recordAuditLog, AuditActions } from '@/lib/audit/audit-service';

export interface UpdateInventoryInput {
  totalStock?: number;
  reorderThreshold?: number;
}

/**
 * Fetch all warehouses.
 */
export async function getWarehouses() {
  return prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * Update a single inventory record's configurations.
 */
export async function updateInventory(
  id: string,
  data: UpdateInventoryInput
) {
  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    },
  });

  if (!inventory) {
    throw new NotFoundError('Inventory', id);
  }

  const updated = await prisma.inventory.update({
    where: { id },
    data,
    include: {
      product: true,
      warehouse: true,
    },
  });

  // Log administration event
  recordAuditLog({
    action: AuditActions.INVENTORY_UPDATED,
    entityType: 'Inventory',
    entityId: id,
    metadata: {
      previous: {
        totalStock: inventory.totalStock,
        reorderThreshold: inventory.reorderThreshold,
      },
      updated: data,
      productName: inventory.product.name,
      warehouseCode: inventory.warehouse.code,
    },
  }).catch(() => {});

  return updated;
}
