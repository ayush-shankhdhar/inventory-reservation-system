import { prisma } from '@/lib/db/prisma';
import type { AuditLogDTO } from '@/types';

/**
 * Audit logging service.
 *
 * Records all significant system events for compliance, debugging,
 * and analytics. Audit writes are intentionally fire-and-forget —
 * a failed audit log should NEVER block or fail a business operation.
 *
 * In production, this would typically write to a separate audit
 * database or event stream (e.g., Kafka) to avoid impacting
 * transactional throughput.
 */

interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  sessionId?: string;
}

/**
 * Record an audit log entry (fire-and-forget).
 * Never throws — errors are logged and swallowed.
 */
export async function recordAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ?? {},
        ipAddress: entry.ipAddress,
        sessionId: entry.sessionId,
      },
    });
  } catch (error) {
    // Audit failures are logged but never propagated.
    // Business operations must not fail due to audit issues.
    console.error('[AuditLog] Failed to record audit entry:', error, entry);
  }
}

/**
 * Batch record multiple audit entries.
 */
export async function recordAuditLogBatch(entries: AuditEntry[]): Promise<void> {
  try {
    await prisma.auditLog.createMany({
      data: entries.map((entry) => ({
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ?? {},
        ipAddress: entry.ipAddress,
        sessionId: entry.sessionId,
      })),
    });
  } catch (error) {
    console.error(`[AuditLog] Failed to record ${entries.length} audit entries:`, error);
  }
}

/**
 * Query recent audit log entries with optional filtering.
 */
export async function getRecentAuditLogs(
  limit: number = 20,
  filters?: {
    entityType?: string;
    entityId?: string;
    action?: string;
  }
): Promise<AuditLogDTO[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(filters?.entityType && { entityType: filters.entityType }),
      ...(filters?.entityId && { entityId: filters.entityId }),
      ...(filters?.action && { action: filters.action }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  }));
}

// Audit action constants — prevents typos and enables grep-ability
export const AuditActions = {
  RESERVATION_CREATED: 'RESERVATION_CREATED',
  RESERVATION_CONFIRMED: 'RESERVATION_CONFIRMED',
  RESERVATION_RELEASED: 'RESERVATION_RELEASED',
  RESERVATION_EXPIRED: 'RESERVATION_EXPIRED',
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
  INVENTORY_RESTOCKED: 'INVENTORY_RESTOCKED',
} as const;
