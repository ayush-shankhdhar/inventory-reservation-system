import { getRedis } from './client';

/**
 * Generic Redis caching layer.
 *
 * Provides TTL-based caching with typed get/set operations.
 * All cache operations are fire-and-forget safe — errors are
 * logged but never propagated to callers. The system works
 * correctly without cache; it's purely a performance optimization.
 */

const DEFAULT_TTL_SECONDS = 60; // 1 minute default

/**
 * Get a cached value by key. Returns null on miss or error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const value = await redis.get<T>(key);
    return value;
  } catch (error) {
    console.error(`[Cache] GET failed for key "${key}":`, error);
    return null;
  }
}

/**
 * Set a cached value with TTL.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error(`[Cache] SET failed for key "${key}":`, error);
  }
}

/**
 * Delete a cached value. Used for cache invalidation after mutations.
 */
export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[Cache] DELETE failed for key "${key}":`, error);
  }
}

/**
 * Delete all keys matching a pattern. Used for bulk invalidation
 * (e.g., invalidate all product cache entries after inventory change).
 *
 * Note: SCAN-based deletion for production safety (non-blocking).
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      });
      cursor = nextCursor;
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => redis.del(key)));
      }
    } while (cursor !== 0);
  } catch (error) {
    console.error(`[Cache] DELETE_PATTERN failed for "${pattern}":`, error);
  }
}

// Cache key generators — centralized to prevent key collisions
export const CacheKeys = {
  product: (id: string) => `product:${id}`,
  productList: (hash: string) => `products:list:${hash}`,
  inventory: (productId: string, warehouseId: string) => `inventory:${productId}:${warehouseId}`,
  inventoryByProduct: (productId: string) => `inventory:product:${productId}`,
  reservation: (id: string) => `reservation:${id}`,
  reservationList: (hash: string) => `reservations:list:${hash}`,
  idempotency: (key: string, endpoint: string) => `idempotency:${endpoint}:${key}`,
  analytics: () => `analytics:dashboard`,
  warehouses: () => `warehouses:all`,
} as const;
