import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// ---- Hook : filtres synchronisés avec la query string ------------------------------

type Values<K extends string> = Record<K, string>;

/**
 * Filtres d'une page, persistés dans l'URL (?statut=…&page=…).
 * `defaults` donne les clés et leurs valeurs par défaut ; une valeur égale au défaut
 * n'apparaît pas dans l'URL. Changer un filtre remet la page à 1.
 */
export function useFilters<K extends string>(defaults: Values<K>) {
  const [params, setParams] = useSearchParams();
  // Les valeurs par défaut sont figées au premier rendu (l'objet littéral change à chaque rendu du parent).
  const [defs] = useState(defaults);

  const values = useMemo(() => {
    const out = { ...defs };
    for (const k of Object.keys(out) as K[]) {
      const v = params.get(k);
      if (v !== null) out[k] = v;
    }
    return out;
  }, [params, defs]);

  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const set = useCallback(
    (key: K, value: string) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (value === '' || value === defs[key]) p.delete(key);
          else p.set(key, value);
          p.delete('page');
          return p;
        },
        { replace: true },
      );
    },
    [setParams, defs],
  );

  const setPage = useCallback(
    (n: number) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (n <= 1) p.delete('page');
          else p.set('page', String(n));
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const reset = useCallback(() => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const k of Object.keys(defs)) p.delete(k);
        p.delete('page');
        return p;
      },
      { replace: true },
    );
  }, [setParams, defs]);

  const active = (Object.keys(defs) as K[]).some((k) => values[k] !== defs[k]);

  return { values, set, reset, active, page, setPage };
}
