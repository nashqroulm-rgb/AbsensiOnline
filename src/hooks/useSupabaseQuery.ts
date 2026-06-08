import { useState, useEffect, useCallback, type DependencyList } from 'react';
import type { ServiceResult } from '../types';

interface UseSupabaseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSupabaseQuery<T>(
  fetcher: () => Promise<ServiceResult<T>>,
  deps: DependencyList = [],
): UseSupabaseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger(n => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then(result => {
        if (cancelled) return;
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      })
      .catch(e => {
        if (!cancelled) setError(e.message || 'Terjadi kesalahan');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [trigger, ...deps]);

  return { data, loading, error, refetch };
}
