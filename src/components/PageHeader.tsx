import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  title: ReactNode;
  /** Une phrase, en français courant, sur ce à quoi sert la page. */
  subtitle?: ReactNode;
  /** Fil d'Ariane : Section › Page (le dernier élément est la page courante). */
  breadcrumb?: Crumb[];
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumb, actions }: Props) {
  return (
    <header className="page-header">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="breadcrumb" aria-label="Fil d’Ariane">
          <ol>
            {breadcrumb.map((c, i) => {
              const last = i === breadcrumb.length - 1;
              return (
                <li key={`${c.label}-${i}`} aria-current={last ? 'page' : undefined}>
                  {c.to && !last ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="page-header-row">
        <div className="page-header-text">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </header>
  );
}
