import { getRedis } from './client';
import { config } from '@/config';
import { nanoid } from 'nanoid';
import { sleep } from '@/utils';

/**
 * Distributed Lock using Redis (Redlock-lite pattern).
 *
 * WHY: In a multi-server deployment (e.g., Vercel serverless functions),
 * PostgreSQL row-level locks alone aren't sufficient because two requests
 * might hit different servers and both start transactions simultaneously.
 * The distributed lock serializes access BEFORE the database transaction,
 * reducing contention and failed transaction retries.
 *
 * IMPLEMENTATION: SET NX with TTL (atomic acquire), Lua script for
 * safe release (compare-and-delete to prevent releasing another client's lock).
 *
 * SAFETY: The lock has a TTL to prevent deadlocks if the holder crashes.
 * The token ensures only the lock owner can release it.
 */

interface LockResult {
  acquired: boolean;
  token: string;
}

/**
 * Attempt to acquire a distributed lock on a resource.
 *
 * @param resource - Unique identifier for the locked resource (e.g., "inv:productId:warehouseId")
 * @param ttlMs - Time-to-live in milliseconds (auto-release if holder crashes)
 * @returns Lock result with token for release, or { acquired: false } if lock is held
 */
export async function acquireLock(
  resource: string,
  ttlMs: number = config.reservation.lockTtlMs
): Promise<LockResult> {
  const redis = getRedis();
  const token = nanoid(16);
  const lockKey = `lock:${resource}`;

  // No Redis → skip locking. System still safe via PostgreSQL transactions,
  // but may see more transaction retry contention under high load.
  if (!redis) {
    return { acquired: true, token };
  }

  try {
    // SET NX: only succeeds if key doesn't exist (atomic acquire)
    // PX: set TTL in milliseconds
    const result = await redis.set(lockKey, token, {
      nx: true,
      px: ttlMs,
    });

    return {
      acquired: result === 'OK',
      token,
    };
  } catch (error) {
    console.error(`[DistributedLock] Failed to acquire lock for ${resource}:`, error);
    // On Redis failure, allow the operation to proceed (fail-open).
    // PostgreSQL transactions will still ensure correctness.
    return { acquired: true, token };
  }
}

/**
 * Release a distributed lock, but ONLY if the token matches.
 *
 * Uses a Lua script for atomicity: check + delete in a single operation.
 * This prevents a race where:
 * 1. Client A's lock expires
 * 2. Client B acquires the lock
 * 3. Client A tries to release → would delete Client B's lock without token check
 */
export async function releaseLock(resource: string, token: string): Promise<boolean> {
  const redis = getRedis();
  const lockKey = `lock:${resource}`;

  if (!redis) return true;

  try {
    // Lua script: atomic compare-and-delete
    // KEYS[1] = lock key, ARGV[1] = expected token
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await redis.eval(script, [lockKey], [token]);
    return result === 1;
  } catch (error) {
    console.error(`[DistributedLock] Failed to release lock for ${resource}:`, error);
    return false;
  }
}

/**
 * Acquire a lock with retry logic.
 *
 * Implements exponential backoff to handle transient contention.
 * After maxRetries, returns { acquired: false } to let the caller
 * decide how to handle the failure (typically HTTP 409 or 503).
 */
export async function acquireLockWithRetry(
  resource: string,
  ttlMs: number = config.reservation.lockTtlMs,
  maxRetries: number = config.reservation.lockRetryAttempts,
  baseDelayMs: number = config.reservation.lockRetryDelayMs
): Promise<LockResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await acquireLock(resource, ttlMs);
    if (result.acquired) return result;

    // Exponential backoff with jitter to reduce thundering herd
    if (attempt < maxRetries) {
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 50;
      await sleep(delay);
    }
  }

  return { acquired: false, token: '' };
}
