/**
 * Centralized application configuration.
 *
 * All environment variables are validated at startup. Missing required
 * variables will throw descriptive errors to prevent silent failures
 * in production.
 */

function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to your .env file or deployment environment.`
    );
  }
  return value;
}

function getOptionalEnvVar(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  /** Database */
  database: {
    url: () => getEnvVar('DATABASE_URL'),
    directUrl: () => getEnvVar('DIRECT_URL'),
  },

  /** Redis (Upstash) */
  redis: {
    url: () => getOptionalEnvVar('UPSTASH_REDIS_REST_URL', ''),
    token: () => getOptionalEnvVar('UPSTASH_REDIS_REST_TOKEN', ''),
    isConfigured: () =>
      !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN,
  },

  /** Application */
  app: {
    url: () => getOptionalEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    environment: () => getOptionalEnvVar('NODE_ENV', 'development'),
    isProduction: () => process.env.NODE_ENV === 'production',
    isDevelopment: () => process.env.NODE_ENV !== 'production',
  },

  /** Reservation settings */
  reservation: {
    /** How long a reservation is held before auto-expiry (in minutes) */
    expiryMinutes: 10,
    /** Maximum quantity per single reservation */
    maxQuantity: 10,
    /** How often the expiry cron runs (in minutes) */
    cronIntervalMinutes: 1,
    /** Maximum retry attempts for lock acquisition */
    lockRetryAttempts: 3,
    /** Delay between lock retry attempts (in ms) */
    lockRetryDelayMs: 200,
    /** Distributed lock TTL (in ms) — slightly longer than expected transaction time */
    lockTtlMs: 10_000,
  },

  /** Rate limiting */
  rateLimit: {
    /** General API requests per window */
    general: { requests: 100, windowMs: 60_000 },
    /** Reservation creation — stricter to prevent abuse */
    reservation: { requests: 10, windowMs: 60_000 },
    /** Sensitive operations (confirm/release) */
    sensitive: { requests: 20, windowMs: 60_000 },
  },

  /** Cron */
  cron: {
    secret: () => getOptionalEnvVar('CRON_SECRET', 'dev-cron-secret'),
  },

  /** Pagination defaults */
  pagination: {
    defaultPage: 1,
    defaultPageSize: 12,
    maxPageSize: 100,
  },
} as const;
