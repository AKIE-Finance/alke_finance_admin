import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  /** Nombre d'éléments ; 0 replie la section en une ligne discrète. */
  count?: number;
  /** Texte de la ligne repliée quand `count` vaut 0. */
  emptyText?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Section de page de détail : en-tête avec compteur, et repli en une ligne quand elle est vide. */
export default function Section({ title, count, emptyText = 'Aucun élément.', actions, children }: SectionProps) {
  const isEmpty = count === 0;
  return (
    <section className={`section ${isEmpty ? 'section-empty' : ''}`.trim()} aria-label={title}>
      <div className="section-head">
        <h2 className="section-title">
          {title}
          {typeof count === 'number' && <span className="section-count">{count}</span>}
        </h2>
        {actions && <div className="section-actions">{actions}</div>}
      </div>
      {isEmpty ? <p className="section-empty-row">{emptyText}</p> : <div className="card">{children}</div>}
    </section>
  );
}

interface DefItem {
  label: string;
  value: ReactNode;
}

/** Grille de faits clés (dl) : libellé au-dessus de la valeur, colonnes fluides. */
export function DefinitionGrid({ items }: { items: DefItem[] }) {
  return (
    <dl className="def-grid">
      {items.map((it) => (
        <div key={it.label} className="def-item">
          <dt>{it.label}</dt>
          <dd>{it.value ?? <span className="muted">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
