import type { ReactNode } from 'react';
import { useAuth, type Action } from '../auth';
import EmptyState from './EmptyState';

interface Props {
  action: Action;
  children: ReactNode;
}

/** Bloque le rendu d'une page si le rôle courant n'a pas la permission. */
export default function RequirePermission({ action, children }: Props) {
  const { can } = useAuth();
  if (!can(action)) {
    return (
      <div className="card" role="alert">
        <EmptyState kind="shield" title="Accès refusé" hint="Votre rôle ne permet pas d’accéder à cette section. Rapprochez-vous d’un administrateur si vous pensez qu’il s’agit d’une erreur." />
      </div>
    );
  }
  return <>{children}</>;
}
