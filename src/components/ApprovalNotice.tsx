import { Link } from 'react-router-dom';
import type { PendingApproval } from '../api/types';
import { label } from '../labels';
import Copyable from './Copyable';
import Icon from './icons';

interface Props {
  /** Demande créée (affiche l'identifiant) ; sans valeur, simple avertissement préalable. */
  approval?: PendingApproval | null;
  message?: string;
}

export default function ApprovalNotice({ approval, message }: Props) {
  return (
    <div className="notice notice-approval" role="note">
      <Icon name="approvals" size={18} className="notice-icon" />
      <div>
        <strong>Validation à deux yeux.</strong>{' '}
        {message ??
          (approval
            ? 'La demande a été enregistrée ; un second opérateur doit la valider avant application.'
            : 'Cette action sera soumise à validation par un second opérateur avant d’être appliquée.')}
        {approval && (
          <div className="notice-detail">
            Demande <Copyable value={approval.id} what="l’identifiant de la demande" /> · {label('approvalAction', approval.actionType)} ·{' '}
            <Link to="/approvals">Voir les approbations</Link>
          </div>
        )}
      </div>
    </div>
  );
}
