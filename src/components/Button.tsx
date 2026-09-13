import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Icon, { Spinner, type IconName } from './icons';

type Variant = 'primary' | 'green' | 'outline' | 'danger' | 'danger-solid' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  /** Désactive le bouton et affiche un indicateur de progression, sans changer le libellé. */
  busy?: boolean;
  icon?: IconName;
  children?: ReactNode;
}

export default function Button({ variant = 'outline', size = 'md', busy = false, icon, children, className, disabled, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${busy ? 'is-busy' : ''} ${className ?? ''}`.replace(/\s+/g, ' ').trim()}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Obligatoire : seul libellé accessible du bouton. */
  label: string;
  busy?: boolean;
  size?: number;
}

/** Bouton icône seul : aria-label obligatoire, info-bulle native identique. */
export function IconButton({ icon, label, busy = false, size = 16, className, disabled, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      className={`icon-btn ${busy ? 'is-busy' : ''} ${className ?? ''}`.replace(/\s+/g, ' ').trim()}
      aria-label={label}
      title={label}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <Spinner size={size} /> : <Icon name={icon} size={size} />}
    </button>
  );
}
