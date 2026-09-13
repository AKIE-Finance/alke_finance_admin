import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './api';
import { toast } from './toast';

/**
 * Charge des données : toute erreur part dans le bus de toasts (jamais avalée).
 * `deps` relance le chargement ; `reload()` le relance manuellement.
 */
export function useLoad<T>(loader: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loaderRef
      .current()
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = errorMessage(err);
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload, setData };
}

/**
 * Exécute une mutation avec état "occupé", try/catch/finally et toasts.
 * Retourne `undefined` si la mutation a échoué.
 */
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>, successMessage?: string): Promise<T | undefined> => {
    setBusy(true);
    try {
      const result = await fn();
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (err) {
      toast.error(errorMessage(err));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, run };
}

/** Petit hook de formulaire contrôlé. */
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  }, []);
  const reset = useCallback((next?: T) => setValues(next ?? initial), [initial]);
  return { values, set, reset, setValues };
}
