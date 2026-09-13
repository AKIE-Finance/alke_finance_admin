import { label as labelOf, tone as toneOf, type LabelKind, type Tone } from '../labels';

interface Props {
  value: string | boolean | null | undefined;
  /** Énumération d'origine : choisit le libellé français et la teinte sémantique. */
  kind?: LabelKind;
  /** Libellé forcé (sinon déduit de `kind` + `value`). */
  label?: string;
  tone?: Tone;
  className?: string;
}

/** Pastille d'état : le texte est toujours présent, la couleur n'est jamais le seul indicateur. */
export default function Badge({ value, kind, label, tone, className }: Props) {
  if (value === null || value === undefined || value === '') {
    return <span className={`badge badge-neutral ${className ?? ''}`.trim()}>—</span>;
  }
  const t = tone ?? toneOf(kind, value);
  const text = label ?? (kind ? labelOf(kind, value) : typeof value === 'boolean' ? labelOf('boolean', value) : fallback(value));
  return (
    <span className={`badge badge-${t} ${className ?? ''}`.trim()} title={typeof value === 'string' && value !== text ? value : undefined}>
      {text}
    </span>
  );
}

function fallback(key: string): string {
  const words = key.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '—';
}
