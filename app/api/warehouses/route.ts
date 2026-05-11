import { NextRequest } from 'next/server';
import { getWarehouses } from '@/lib/inventory/inventory-service';
import { errorToResponse, successResponse } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateTraceId } from '@/utils';

/**
 * GET /api/warehouses — All active warehouses with summary stats.
 */
export async function GET(request: NextRequest) {
  const traceId = generateTraceId();

  try {
    await checkRateLimit(getClientIp(request), 'general');
    const warehouses = await getWarehouses();
    return successResponse(warehouses, traceId);
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}
