import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

/**
 * Singleton Prisma Client with pg driver adapter (Prisma v7).
 *
 * Uses a single connection (not a pool) to stay within Supabase's
 * free-tier limit of 15 session-mode connections. Previous dev server
 * crashes can leave ghost sessions lingering for minutes, so we
 * minimize our footprint to exactly 1 connection.
 *
 * The pooled DATABASE_URL (port 6543, PgBouncer) is preferred because
 * it multiplexes connections on the server side. Falls back to
 * DIRECT_URL (port 5432) if needed.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
};

function initializePrisma() {
  if (globalForPrisma.prisma && globalForPrisma.pgPool) {
    return { prisma: globalForPrisma.prisma, pool: globalForPrisma.pgPool };
  }

  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

  if (!connectionString) {
    throw new Error('Missing DATABASE_URL or DIRECT_URL environment variable');
  }

  // Single connection — prevents session exhaustion on Supabase free tier.
  // PgBouncer (port 6543) handles multiplexing server-side.
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });

  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  return { prisma: client, pool };
}

const { prisma: clientInstance, pool: poolInstance } = initializePrisma();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = clientInstance;
  globalForPrisma.pgPool = poolInstance;
}

export const prisma = clientInstance;
