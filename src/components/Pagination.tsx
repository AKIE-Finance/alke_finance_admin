import Button from './Button';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

/** Boutons précédent / suivant ; le décompte est affiché par le pied de tableau. */
export default function Pagination({ page, pageSize, total, onChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted num">
        page {page} / {pages}
      </span>
      <div className="pagination-buttons">
        <Button size="sm" icon="chevronLeft" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Page précédente">
          Précédent
        </Button>
        <Button size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Page suivante">
          Suivant
        </Button>
      </div>
    </nav>
  );
}
