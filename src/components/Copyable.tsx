import { useEffect, useState } from 'react';
import { toast } from '../toast';
import { IconButton } from './Button';

interface Props {
  value: string | null | undefined;
  /** Nombre de caractères affichés avant troncature (0 = tout). */
  short?: number;
  /** Libellé du bouton copier (ex. « Copier l’identifiant »). */
  what?: string;
  className?: string;
}

/** Bouton icône « copier » seul : confirme visuellement 1,5 s puis revient à l'état initial. */
export function CopyButton({ value, what = 'l’identifiant' }: { value: string; what?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      toast.error('Copie impossible dans ce navigateur.');
    }
  };

  return (
    <IconButton
      icon={copied ? 'check' : 'copy'}
      size={14}
      className={`copy-btn ${copied ? 'is-copied' : ''}`.trim()}
      label={copied ? 'Copié' : `Copier ${what}`}
      onClick={(e) => {
        e.stopPropagation();
        void copy();
      }}
    />
  );
}

/** Identifiant / empreinte tronqué en monospace, avec info-bulle complète et copie presse-papiers. */
export default function Copyable({ value, short = 8, what = 'l’identifiant', className }: Props) {
  if (!value) return <span className="muted">—</span>;
  const shown = short > 0 && value.length > short + 1 ? `${value.slice(0, short)}…` : value;
  return (
    <span className={`copyable ${className ?? ''}`.trim()}>
      <span className="mono" title={value}>
        {shown}
      </span>
      <CopyButton value={value} what={what} />
    </span>
  );
}
