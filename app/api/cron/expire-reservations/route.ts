import { NextRequest } from 'next/server';
import { processExpiredReservations } from '@/lib/reservations/expiry-service';
import { errorToResponse, successResponse } from '@/lib/errors';
import { generateTraceId } from '@/utils';
import { config } from '@/config';

/**
 * GET /api/cron/expire-reservations — Vercel Cron endpoint.
 *
 * Triggered every minute to batch-expire overdue reservations.
 * Secured with CRON_SECRET to prevent unauthorized invocation.
 *
 * Vercel Cron sends a GET request with the Authorization header
 * containing the CRON_SECRET configured in vercel.json.
 */
export async function GET(request: NextRequest) {
  const traceId = generateTraceId();

  try {
    // Verify cron secret — prevents external callers from triggering expiry
    const authHeader = request.headers.get('authorization');
    const cronSecret = config.cron.secret();

    if (config.app.isProduction() && authHeader !== `Bearer ${cronSecret}`) {
      return errorToResponse(
        { message: 'Unauthorized', statusCode: 401, code: 'UNAUTHORIZED' },
        traceId
      );
    }

    const result = await processExpiredReservations();

    return successResponse(
      {
        message: `Processed ${result.processed} expired reservations`,
        ...result,
      },
      traceId
    );
  } catch (error) {
    return errorToResponse(error, traceId);
  }
}
