'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic polling hook for real-time data updates.
 * Fetches data at a regular interval and provides loading/error states.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 5000,
  enabled: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fetch failed'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    fetchData();
    const interval = setInterval(fetchData, intervalMs);
    return () => clearInterval(interval);
  }, [fetchData, intervalMs, enabled]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    return fetchData();
  }, [fetchData]);

  return { data, error, isLoading, refetch };
}
