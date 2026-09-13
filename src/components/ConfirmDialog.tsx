import type { ReactNode } from 'react';
import Button from './Button';
import Modal from './Modal';

interface Props {
  title: string;
  /** Explique l'effet concret de l'action (« Le client ne pourra plus… »). */
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  /** Désactive la confirmation tant qu'une condition n'est pas remplie (motif saisi…). */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: Props) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={480}
      footer={
        <>
          <Button onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger-solid' : 'primary'} onClick={onConfirm} busy={busy} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className={`confirm-message ${danger ? 'confirm-danger' : ''}`.trim()}>{message}</p>
      {children}
    </Modal>
  );
}
