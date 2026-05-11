import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * Merge Tailwind classes with proper precedence handling.
 * Uses clsx for conditional classes and tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generate a human-readable reservation number.
 * Format: RSV-YYYYMMDD-XXXXX
 *
 * Designed to be:
 * - Readable in customer communications
 * - Sortable by date prefix
 * - Unique via random suffix (nanoid)
 */
export function generateReservationNumber(): string {
  const datePart = format(new Date(), 'yyyyMMdd');
  const randomPart = nanoid(6).toUpperCase();
  return `RSV-${datePart}-${randomPart}`;
}

/**
 * Generate a unique request trace ID for logging and debugging.
 * Attached to every API request for end-to-end traceability.
 */
export function generateTraceId(): string {
  return `trace_${nanoid(16)}`;
}

/**
 * Hash a request payload for idempotency comparison.
 * Uses SHA-256 to produce a deterministic fingerprint of the request body.
 */
export function hashPayload(payload: unknown): string {
  const serialized = JSON.stringify(payload, Object.keys(payload as object).sort());
  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Format a number as USD currency.
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

/**
 * Format a date for display.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy HH:mm');
}

/**
 * Format a date as relative time (e.g., "2 minutes ago").
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Calculate remaining seconds until a target date.
 * Returns 0 if the date has passed.
 */
export function getRemainingSeconds(expiresAt: Date | string): number {
  const target = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const remaining = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
  return remaining;
}

/**
 * Format seconds into MM:SS display format.
 */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Sleep utility for retry logic and testing.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Type-safe object entries.
 */
export function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

/**
 * Calculate stock status from inventory numbers.
 */
export function getStockStatus(totalStock: number, reservedStock: number, reorderThreshold: number) {
  const available = totalStock - reservedStock;
  if (available <= 0) return { label: 'Out of Stock', color: 'destructive' as const, available };
  if (available <= reorderThreshold) return { label: 'Low Stock', color: 'warning' as const, available };
  return { label: 'In Stock', color: 'success' as const, available };
}
