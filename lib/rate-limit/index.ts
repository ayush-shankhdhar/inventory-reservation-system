import { config } from '@/config';
import { RateLimitError } from '@/lib/errors';

/**
 * Rate limiting using local map store.
 *
 * NOTE: In a true distributed deployment without Redis, this is scoped
 * to the specific serverless node. For global limiting, Redis is required.
 * As requested, global Redis limiting is removed in favor of single-stack system.
 */

type RateLimitTier = 'general' | 'reservation' | 'sensitive';

// In-memory store for tracking requests locally
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
 * Check rate limit for a request locally.
 * Throws RateLimitError if limit exceeded.
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = 'general'
): Promise<void> {
  const limiter = getInMemoryLimiter(tier);
  const result = await limiter.limit(identifier);
  if (!result.success) {
    throw new RateLimitError();
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
