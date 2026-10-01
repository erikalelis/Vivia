import { useCallback, useEffect, useState } from 'react';
import { friendly } from '@/services/api';

/** Carga datos async con estados de carga y error comprensible. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    setError(null);
    try { setData(await fn()); } catch (e) { setError(friendly(e)); } finally { setLoading(false); }
  }, deps);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload, setData };
}
