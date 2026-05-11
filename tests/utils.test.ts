import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateReservationNumber, hashPayload, getStockStatus, formatCountdown, getRemainingSeconds } from '@/utils';

describe('Utility Functions', () => {
  describe('generateReservationNumber', () => {
    it('should generate a reservation number matching the expected format', () => {
      const number = generateReservationNumber();
      expect(number).toMatch(/^RSV-\d{8}-[A-Za-z0-9_-]{6}$/);
    });

    it('should generate unique numbers on each call', () => {
      const numbers = new Set(Array.from({ length: 100 }, () => generateReservationNumber()));
      expect(numbers.size).toBe(100);
    });
  });

  describe('hashPayload', () => {
    it('should produce consistent hashes for the same payload', () => {
      const payload = { productId: 'abc', quantity: 5 };
      const hash1 = hashPayload(payload);
      const hash2 = hashPayload(payload);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different payloads', () => {
      const hash1 = hashPayload({ productId: 'abc', quantity: 5 });
      const hash2 = hashPayload({ productId: 'abc', quantity: 6 });
      expect(hash1).not.toBe(hash2);
    });

    it('should be order-independent for object keys', () => {
      const hash1 = hashPayload({ a: 1, b: 2 });
      const hash2 = hashPayload({ b: 2, a: 1 });
      expect(hash1).toBe(hash2);
    });
  });

  describe('getStockStatus', () => {
    it('should return "Out of Stock" when available is 0', () => {
      const status = getStockStatus(10, 10, 5);
      expect(status.label).toBe('Out of Stock');
      expect(status.color).toBe('destructive');
      expect(status.available).toBe(0);
    });

    it('should return "Low Stock" when available is below threshold', () => {
      const status = getStockStatus(10, 7, 5);
      expect(status.label).toBe('Low Stock');
      expect(status.color).toBe('warning');
      expect(status.available).toBe(3);
    });

    it('should return "In Stock" when available is above threshold', () => {
      const status = getStockStatus(100, 10, 5);
      expect(status.label).toBe('In Stock');
      expect(status.color).toBe('success');
      expect(status.available).toBe(90);
    });
  });

  describe('formatCountdown', () => {
    it('should format seconds into MM:SS', () => {
      expect(formatCountdown(600)).toBe('10:00');
      expect(formatCountdown(65)).toBe('01:05');
      expect(formatCountdown(0)).toBe('00:00');
      expect(formatCountdown(3599)).toBe('59:59');
    });
  });

  describe('getRemainingSeconds', () => {
    it('should return positive seconds for future dates', () => {
      const future = new Date(Date.now() + 60000);
      const remaining = getRemainingSeconds(future);
      expect(remaining).toBeGreaterThan(55);
      expect(remaining).toBeLessThanOrEqual(60);
    });

    it('should return 0 for past dates', () => {
      const past = new Date(Date.now() - 60000);
      expect(getRemainingSeconds(past)).toBe(0);
    });
  });
});
