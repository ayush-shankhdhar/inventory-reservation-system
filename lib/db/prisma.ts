import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

/**
 * Singleton Prisma Client with pg driver adapter (Prisma v7).
 *
 * Prisma v7 requires explicit driver adapters instead of connection
 * strings in the schema. We use node-postgres (pg) directly, which
 * gives us full control over connection pooling and supports
 * interactive transactions with FOR UPDATE locks.
 *
 * IMPORTANT: We use DIRECT_URL (not the pooled DATABASE_URL) because
 * PgBouncer's transaction pooling mode doesn't support the extended
 * query protocol needed for prepared statements in interactive transactions.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Missing DIRECT_URL or DATABASE_URL environment variable');
  }

  const pool = new pg.Pool({
    connectionString,
    max: 10,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
