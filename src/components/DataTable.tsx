import type { ReactNode } from 'react';
import EmptyState, { type EmptyKind } from './EmptyState';
import Pagination from './Pagination';

export type ColumnPriority = 'primary' | 'secondary' | 'detail';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  /** Colonnes numériques : chiffres tabulaires. */
  numeric?: boolean;
  /** `detail` disparaît sous 1200 px, `secondary` sous 900 px ; `primary` reste toujours. */
  priority?: ColumnPriority;
  /** Empêche le retour à la ligne (dates, identifiants). */
  nowrap?: boolean;
}

interface EmptyProps {
  kind?: EmptyKind;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  /** État vide illustré. `emptyMessage` reste accepté comme raccourci (titre seul). */
  empty?: EmptyProps;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /** Légende (visuellement masquée) : décrit le contenu du tableau aux lecteurs d'écran. */
  caption: string;
  skeletonRows?: number;
  /** Total serveur (pagination) ; par défaut le nombre de lignes affichées. */
  total?: number;
  pagination?: { page: number; pageSize: number; onChange: (page: number) => void };
  /** Masque le pied (décompte + pagination), ex. tableaux imbriqués dans un tiroir. */
  hideFooter?: boolean;
  /** Largeur minimale du tableau avant défilement horizontal. */
  minWidth?: number;
}

function cellClass<T>(c: Column<T>): string {
  const parts: string[] = [];
  if (c.align) parts.push(`al-${c.align}`);
  if (c.numeric) parts.push('num');
  if (c.nowrap) parts.push('nowrap');
  if (c.priority && c.priority !== 'primary') parts.push(`col-${c.priority}`);
  return parts.join(' ');
}

export default function DataTable<T>({
  columns,
  rows: rowsProp,
  rowKey,
  loading = false,
  empty,
  emptyMessage = 'Aucun élément.',
  onRowClick,
  caption,
  skeletonRows = 5,
  total,
  pagination,
  hideFooter = false,
  minWidth,
}: Props<T>) {
  const rows = Array.isArray(rowsProp) ? rowsProp : undefined;
  const showSkeleton = loading && (!rows || rows.length === 0);
  const isEmpty = !loading && (!rows || rows.length === 0);
  const count = total ?? rows?.length ?? 0;
  const emptyProps: EmptyProps = empty ?? { title: emptyMessage };

  return (
    <div className="table-wrap" aria-busy={loading || undefined}>
      <div className="table-scroll">
        <table className="data-table" style={minWidth ? { minWidth } : undefined}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cellClass(c) || undefined} style={c.width ? { width: c.width } : undefined}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {showSkeleton &&
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`sk-${i}`} className="skeleton-row" aria-hidden="true">
                  {columns.map((c) => (
                    <td key={c.key} className={cellClass(c) || undefined}>
                      <span className="skeleton" style={{ width: `${45 + ((i * 17 + c.key.length * 7) % 45)}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            {isEmpty && (
              <tr className="empty-row">
                <td colSpan={columns.length}>
                  <EmptyState kind={emptyProps.kind} title={emptyProps.title} hint={emptyProps.hint} action={emptyProps.action} />
                </td>
              </tr>
            )}
            {!showSkeleton &&
              rows?.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={onRowClick ? 'clickable' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cellClass(c) || undefined}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!hideFooter && !isEmpty && (
        <div className="table-footer">
          <span className="muted num" role="status">
            {showSkeleton ? 'Chargement des données' : `${count} élément${count > 1 ? 's' : ''}`}
          </span>
          {pagination && <Pagination page={pagination.page} pageSize={pagination.pageSize} total={count} onChange={pagination.onChange} />}
        </div>
      )}
    </div>
  );
}
