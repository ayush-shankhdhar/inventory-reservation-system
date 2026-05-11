#!/usr/bin/env npx tsx

/**
 * Standalone expiry script — can be run via cron or CLI.
 *
 * Usage:
 *   npx tsx scripts/cleanup-expired.ts
 *
 * This script is independent of the Next.js server and can be
 * scheduled via system cron, Kubernetes CronJob, or similar.
 */

import 'dotenv/config';

async function main() {
  // Dynamic import to ensure env vars are loaded first
  const { processExpiredReservations } = await import('../lib/reservations/expiry-service');

  console.log(`[${new Date().toISOString()}] Starting expiry cleanup...`);

  const result = await processExpiredReservations();

  console.log(`[${new Date().toISOString()}] Cleanup complete:`, {
    processed: result.processed,
    succeeded: result.succeeded,
    failed: result.failed,
  });

  if (result.errors.length > 0) {
    console.warn('Errors:', result.errors);
  }

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error in cleanup script:', error);
  process.exit(1);
});
