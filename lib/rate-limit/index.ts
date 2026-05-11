import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '@/lib/redis/client';
import { config } from '@/config';
import { RateLimitError } from '@/lib/errors';

/**
 * Rate limiting using Upstash Ratelimit (token bucket algorithm).
 *
 * WHY token bucket: It allows short bursts while maintaining a
 * steady average rate. This matches real user behavior — a user
 * might rapidly click through pages but shouldn't be penalized
 * for normal browsing patterns.
 *
 * Fallback: When Redis is unavailable, rate limiting is disabled.
 * This is a deliberate fail-open choice — availability over strict
 * rate enforcement in degraded states.
 */

type RateLimitTier = 'general' | 'reservation' | 'sensitive';

// In-memory fallback for development (no Redis)
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function getInMemoryLimiter(tier: RateLimitTier) {
  const tierConfig = config.rateLimit[tier];
  return {
    limit: async (identifier: string) => {
      const key = `${tier}:${identifier}`;
      const now = Date.now();
      const entry = inMemoryStore.get(key);

      if (!entry || now > entry.resetAt) {
        inMemoryStore.set(key, { count: 1, resetAt: now + tierConfig.windowMs });
        return { success: true, remaining: tierConfig.requests - 1 };
      }

      entry.count++;
      if (entry.count > tierConfig.requests) {
        return { success: false, remaining: 0 };
      }

      return { success: true, remaining: tierConfig.requests - entry.count };
    },
  };
}

/**
 * Check rate limit for a request.
 * Throws RateLimitError if limit exceeded.
 *
 * @param identifier - Usually IP address or session ID
 * @param tier - Rate limit tier (different limits per operation type)
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = 'general'
): Promise<void> {
  const redis = getRedis();
  const tierConfig = config.rateLimit[tier];

  if (redis) {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tierConfig.requests, `${tierConfig.windowMs}ms`),
      analytics: false,
      prefix: `ratelimit:${tier}`,
    });

    const result = await ratelimit.limit(identifier);
    if (!result.success) {
      throw new RateLimitError(result.reset ? result.reset - Date.now() : undefined);
    }
  } else {
    // In-memory fallback for local development
    const limiter = getInMemoryLimiter(tier);
    const result = await limiter.limit(identifier);
    if (!result.success) {
      throw new RateLimitError();
    }
  }
}

/**
 * Extract client IP from request headers.
 * Handles various proxy configurations (Vercel, Cloudflare, nginx).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return '127.0.0.1';
}
