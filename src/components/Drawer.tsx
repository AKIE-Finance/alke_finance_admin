import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}

/** Tiroir latéral pour les vues de détail (lot, dossier de conformité…). Échap et fond ferment ; le focus revient au déclencheur. */
export default function Drawer({ title, onClose, children, actions }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // Une modale ouverte au-dessus du tiroir gère elle-même Échap.
      if (e.key === 'Escape' && !document.querySelector('.modal-backdrop')) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <>
      <div className="drawer-backdrop" onMouseDown={onClose} />
      <aside ref={panelRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="drawer-header">
          <h3 id={titleId}>{title}</h3>
          <div className="drawer-header-actions">
            {actions}
            <IconButton icon="close" label="Fermer" onClick={onClose} />
          </div>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}
