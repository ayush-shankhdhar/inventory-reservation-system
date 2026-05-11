import { prisma } from '@/lib/db/prisma';
import { cacheGet, cacheSet, cacheDelete, CacheKeys } from '@/lib/redis/cache';
import { hashPayload } from '@/utils';

/**
 * Idempotency Service — Ensures exactly-once processing for mutations.
 *
 * Flow:
 * 1. Client sends Idempotency-Key header with POST request
 * 2. We check Redis (fast) then DB (fallback) for existing response
 * 3. If found: return cached response without re-processing
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

  // Fast path: check Redis cache
  const cacheKey = CacheKeys.idempotency(key, endpoint);
  const cached = await cacheGet<{ response: unknown; statusCode: number }>(cacheKey);
  if (cached) {
    return { exists: true, response: cached.response, statusCode: cached.statusCode };
  }

  // Slow path: check database
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

    // Warm the cache for future lookups
    await cacheSet(cacheKey, {
      response: existing.response,
      statusCode: existing.statusCode,
    }, 3600);

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

    // Cache in Redis for fast future lookups (1 hour TTL)
    const cacheKey = CacheKeys.idempotency(key, endpoint);
    await cacheSet(cacheKey, { response, statusCode }, 3600);
  } catch (error: any) {
    // Unique constraint violation = concurrent duplicate request.
    // This is fine — the first one wins, second one will find it on retry.
    if (error?.code === 'P2002') {
      return;
    }
    console.error('[Idempotency] Failed to store result:', error);
  }
}
