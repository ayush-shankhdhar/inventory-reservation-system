import { NextRequest } from 'next/server';
import { releaseReservation } from '@/lib/reservations/reservation-service';
import { errorToResponse, successResponse } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateTraceId } from '@/utils';

/**
 * POST /api/reservations/:id/release — Release a reservation (payment failed).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = generateTraceId();

  try {
    await checkRateLimit(getClientIp(request), 'sensitive');
    const { id } = await params;
    const reservation = await releaseReservation(id);
    return successResponse(reservation, traceId);
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}
