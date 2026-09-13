import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
  /** Sous-titre discret sous le titre (contexte de l'action). */
  description?: ReactNode;
}

const FOCUSABLE =
  'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Boîte de dialogue modale : piège de focus (Tab / Maj+Tab), Échap et clic sur le fond ferment,
 * le focus revient à l'élément déclencheur à la fermeture.
 */
export default function Modal({ title, onClose, children, width = 520, footer, description }: Props) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => el.offsetParent !== null || el === document.activeElement);
    const preferred = panel?.querySelector<HTMLElement>('[autofocus]') ?? focusables().find((el) => !el.classList.contains('icon-btn'));
    (preferred ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === 'Tab' && panel) {
        const list = focusables();
        if (list.length === 0) {
          e.preventDefault();
          panel.focus();
          return;
        }
        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && (active === first || !panel.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        style={{ width }}
      >
        <div className="modal-header">
          <div>
            <h3 id={titleId}>{title}</h3>
            {description && (
              <p id={descId} className="modal-description">
                {description}
              </p>
            )}
          </div>
          <IconButton icon="close" label="Fermer" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
