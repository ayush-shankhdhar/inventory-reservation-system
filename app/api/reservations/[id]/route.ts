import { NextRequest } from 'next/server';
import { getReservation, releaseReservation } from '@/lib/reservations/reservation-service';
import { errorToResponse, successResponse } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateTraceId } from '@/utils';

/**
 * GET /api/reservations/:id — Single reservation detail.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = generateTraceId();

  try {
    await checkRateLimit(getClientIp(request), 'general');
    const { id } = await params;
    const reservation = await getReservation(id);
    return successResponse(reservation, traceId);
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}

/**
 * DELETE /api/reservations/:id — Cancel/release a reservation.
 */
export async function DELETE(
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
