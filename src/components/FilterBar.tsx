import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { IconButton } from './Button';

// ---- Barre de filtres -----------------------------------------------------------------

interface BarProps {
  children: ReactNode;
  /** Actions à droite (boutons primaires, export…). */
  actions?: ReactNode;
  /** Un filtre au moins diffère de sa valeur par défaut : affiche « Réinitialiser ». */
  active?: boolean;
  onReset?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  label?: string;
}

export default function FilterBar({ children, actions, active = false, onReset, onRefresh, refreshing = false, label = 'Filtres' }: BarProps) {
  return (
    <div className="filter-bar" role="search" aria-label={label}>
      <div className="filter-bar-fields">
        {children}
        {active && onReset && (
          <button type="button" className="link-btn filter-reset" onClick={onReset}>
            Réinitialiser
          </button>
        )}
      </div>
      <div className="filter-bar-actions">
        {onRefresh && <IconButton icon="refresh" label="Actualiser" onClick={onRefresh} busy={refreshing} className="icon-btn-bordered" />}
        {actions}
      </div>
    </div>
  );
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Libellé de l'option « tout » (valeur vide). Omettre pour ne pas l'afficher. */
  allLabel?: string | null;
  options: { value: string; label: string }[];
  /** Largeur élargie (ex. libellés longs). */
  wide?: boolean;
}

export function FilterSelect({ label, value, onChange, allLabel = 'Tous', options, wide = false, id, ...rest }: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={`filter ${wide ? 'filter-wide' : ''}`.trim()}>
      <label htmlFor={fieldId}>{label}</label>
      <select id={fieldId} value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
        {allLabel !== null && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Délai avant application (ms). 0 = immédiat (dates, mois). */
  debounce?: number;
  wide?: boolean;
}

/** Champ texte de filtre : applique la valeur après 300 ms d'inactivité (ou sur Entrée). */
export function FilterText({ label, value, onChange, debounce = 300, wide = false, id, type = 'text', ...rest }: TextProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [draft, setDraft] = useState(value);
  const [syncedFrom, setSyncedFrom] = useState(value);
  const timer = useRef<number | null>(null);

  // Resynchronise si l'URL change ailleurs (réinitialisation, navigation) : état dérivé pendant le rendu.
  if (value !== syncedFrom) {
    setSyncedFrom(value);
    setDraft(value);
  }

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const commit = (v: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (v.trim() !== value) onChange(v.trim());
  };

  return (
    <div className={`filter ${wide ? 'filter-wide' : ''}`.trim()}>
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        type={type}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          if (timer.current) window.clearTimeout(timer.current);
          if (debounce <= 0) {
            commit(v);
            return;
          }
          timer.current = window.setTimeout(() => commit(v), debounce);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(draft);
          }
        }}
        onBlur={() => commit(draft)}
        {...rest}
      />
    </div>
  );
}
