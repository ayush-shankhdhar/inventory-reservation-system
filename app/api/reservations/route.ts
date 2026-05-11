import { NextRequest } from 'next/server';
import { createReservation, listReservations } from '@/lib/reservations/reservation-service';
import { checkIdempotency, storeIdempotencyResult } from '@/lib/reservations/idempotency-service';
import { errorToResponse, successResponse } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateBody, validateQuery, createReservationSchema, reservationQuerySchema } from '@/validators';
import { generateTraceId } from '@/utils';

/**
 * GET /api/reservations — Paginated reservation listing with filters.
 */
export async function GET(request: NextRequest) {
  const traceId = generateTraceId();

  try {
    await checkRateLimit(getClientIp(request), 'general');
    const params = validateQuery(request.nextUrl.searchParams, reservationQuerySchema);
    const result = await listReservations(params);
    return successResponse(result.data, traceId, 200, result.meta as any);
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}

/**
 * POST /api/reservations — Create a new inventory reservation.
 *
 * This is the most critical endpoint in the system.
 * Supports idempotency via Idempotency-Key header.
 * Rate limited to prevent abuse.
 */
export async function POST(request: NextRequest) {
  const traceId = generateTraceId();

  try {
    // Rate limit (stricter tier for mutations)
    await checkRateLimit(getClientIp(request), 'reservation');

    // Parse and validate request body
    const body = await validateBody(request, createReservationSchema);

    // Idempotency check — return cached response if this request was already processed
    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey) {
      const cached = await checkIdempotency(idempotencyKey, 'POST /api/reservations', body);
      if (cached.exists) {
        return successResponse(cached.response, traceId, cached.statusCode ?? 201);
      }
    }

    // Execute the concurrency-safe reservation
    const reservation = await createReservation(
      body.productId,
      body.warehouseId,
      body.quantity,
      body.sessionId
    );

    // Store idempotency result for future duplicate requests
    if (idempotencyKey) {
      await storeIdempotencyResult(
        idempotencyKey,
        'POST /api/reservations',
        body,
        reservation,
        201
      );
    }

    return successResponse(reservation, traceId, 201);
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}
