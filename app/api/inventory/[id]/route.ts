import { NextRequest } from 'next/server';
import { updateInventory } from '@/lib/inventory/inventory-service';
import { errorToResponse, successResponse } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateBody, updateInventorySchema } from '@/validators';
import { generateTraceId } from '@/utils';

/**
 * PATCH /api/inventory/:id — Admin inventory update.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = generateTraceId();

  try {
    await checkRateLimit(getClientIp(request), 'sensitive');
    const { id } = await params;
    const body = await validateBody(request, updateInventorySchema);
    const inventory = await updateInventory(id, body);
    return successResponse(inventory, traceId);
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}
