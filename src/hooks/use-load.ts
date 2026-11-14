import { useEffect, useRef, useState } from 'react';

/**
 * Runs `load` when `deps` change or `reload()` is called. Stale runs are aborted and their results dropped.
 * While a reload of the SAME deps runs, the previous data stays visible; after a deps change it never does
 * (old places with new distances would be wrong) unless `keep` is set (map pins: better stale than blank).
 * `deps` must be JSON-serialisable.
 */
export function useLoad<T>(load: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[], opts: { keep?: boolean } = {}) {
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(deps);
  const run = `${key}#${nonce}`;
  const [result, setResult] = useState<{ run: string; key: string; data?: T; error?: Error } | null>(null);
  const [last, setLast] = useState<T | undefined>(undefined);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const controller = new AbortController();
    loadRef.current(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setResult({ run, key, data });
        setLast(data);
      },
      (error: Error) => !controller.signal.aborted && setResult({ run, key, error }),
    );
    return () => controller.abort();
  }, [run, key]);

  const current = result?.run === run;
  const sameKey = result?.key === key;
  return {
    data: sameKey && result?.data !== undefined ? result.data : opts.keep ? last : undefined,
    error: current ? result?.error : undefined,
    loading: !current,
    reload: () => setNonce((n) => n + 1),
  };
}
