import { Redis } from '@upstash/redis';
import { config } from '@/config';

/**
 * Upstash Redis client singleton.
 *
 * Redis is used for:
 * 1. Distributed locking during inventory reservation
 * 2. Caching hot data (inventory levels, product listings)
 * 3. Idempotency key acceleration (faster than DB lookup)
 * 4. Rate limiting state storage
 *
 * When Redis is not configured (local dev), operations gracefully
 * degrade to no-ops. The system remains correct without Redis —
 * it just loses the performance/distribution benefits.
 */

let redisInstance: Redis | null = null;

export function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;

  if (!config.redis.isConfigured()) {
    if (config.app.isDevelopment()) {
      console.warn(
        '[Redis] Not configured — running without distributed caching/locking. ' +
          'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for full functionality.'
      );
    }
    return null;
  }

  redisInstance = new Redis({
    url: config.redis.url(),
    token: config.redis.token(),
  });

  return redisInstance;
}

/**
 * Check if Redis is available and responsive.
 */
export async function isRedisHealthy(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
