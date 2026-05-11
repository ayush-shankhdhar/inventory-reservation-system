import { NextRequest } from 'next/server';
import { confirmReservation } from '@/lib/reservations/reservation-service';
import { errorToResponse, successResponse } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateTraceId } from '@/utils';

/**
 * POST /api/reservations/:id/confirm — Confirm a reservation (payment success).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = generateTraceId();

  try {
    await checkRateLimit(getClientIp(request), 'sensitive');
    const { id } = await params;
    const reservation = await confirmReservation(id);
    return successResponse(reservation, traceId);
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}
