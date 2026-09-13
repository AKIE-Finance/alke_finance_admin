import type { ReactNode } from 'react';
import Icon, { type IconName } from './icons';

export type EmptyKind = 'users' | 'documents' | 'orders' | 'files' | 'money' | 'shield' | 'bell' | 'inbox' | 'search';

const GLYPH: Record<EmptyKind, IconName> = {
  users: 'users',
  documents: 'documents',
  orders: 'orders',
  files: 'files',
  money: 'money',
  shield: 'shield',
  bell: 'bell',
  inbox: 'inbox',
  search: 'search',
};

interface Props {
  kind?: EmptyKind;
  title: string;
  /** Une phrase d'orientation : ce qui apparaîtra ici, ou quoi faire. */
  hint?: ReactNode;
  /** Action principale (bouton ou lien), affichée seulement si l'opérateur y est habilité. */
  action?: ReactNode;
  compact?: boolean;
}

export default function EmptyState({ kind = 'inbox', title, hint, action, compact = false }: Props) {
  return (
    <div className={`empty ${compact ? 'empty-compact' : ''}`.trim()} role="status">
      <span className="empty-glyph">
        <Icon name={GLYPH[kind]} size={compact ? 28 : 40} />
      </span>
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
