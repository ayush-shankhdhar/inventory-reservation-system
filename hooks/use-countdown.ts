'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Countdown timer hook for reservation expiry.
 * Returns remaining seconds and formatted display string.
 */
export function useCountdown(expiresAt: string | Date) {
  const getRemaining = useCallback(() => {
    const target = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    return Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
  }, [expiresAt]);

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    const interval = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [getRemaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const percentage = expiresAt
    ? Math.max(0, (remaining / (10 * 60)) * 100)
    : 0;

  return {
    remaining,
    formatted,
    percentage,
    isExpired: remaining <= 0,
    isUrgent: remaining > 0 && remaining <= 120,
  };
}
