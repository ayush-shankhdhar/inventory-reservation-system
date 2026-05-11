import { prisma } from '@/lib/db/prisma';
import { hashPayload } from '@/utils';

/**
 * Idempotency Service — Ensures exactly-once processing for mutations.
 *
 * Flow:
 * 1. Client sends Idempotency-Key header with POST request
 * 2. We check DB for existing response
 * 3. If found: return stored response without re-processing
 * 4. If not: process request, store response, return result
 *
 * This prevents duplicate reservations from network retries,
 * double-clicks, or client-side retry logic.
 */

export interface IdempotencyResult {
  exists: boolean;
  response?: unknown;
  statusCode?: number;
}

/**
 * Check if a request with this idempotency key has been processed before.
 */
export async function checkIdempotency(
  key: string,
  endpoint: string,
  requestBody: unknown
): Promise<IdempotencyResult> {
  if (!key) return { exists: false };

  // Check database for persistent record
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key_endpoint: { key, endpoint } },
  });

  if (existing) {
    // Verify request hash matches (same key but different payload = error)
    const currentHash = hashPayload(requestBody);
    if (existing.requestHash !== currentHash) {
      throw new Error(
        'Idempotency key reused with different request payload. ' +
        'Each unique request must use a unique idempotency key.'
      );
    }

    return {
      exists: true,
      response: existing.response,
      statusCode: existing.statusCode,
    };
  }

  return { exists: false };
}

/**
 * Store the response for an idempotency key after successful processing.
 */
export async function storeIdempotencyResult(
  key: string,
  endpoint: string,
  requestBody: unknown,
  response: unknown,
  statusCode: number
): Promise<void> {
  if (!key) return;

  const requestHash = hashPayload(requestBody);

  try {
    await prisma.idempotencyKey.create({
      data: { key, endpoint, requestHash, response: response as any, statusCode },
    });
  } catch (error: any) {
    // Unique constraint violation = concurrent duplicate request.
    // This is fine — the first one wins, second one will find it on retry.
    if (error?.code === 'P2002') {
      return;
    }
    console.error('[Idempotency] Failed to store result:', error);
  }
}
