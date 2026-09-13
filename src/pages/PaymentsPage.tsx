import { useState } from 'react';
import { api } from '../api';
import type { PaymentDirection, PaymentIntent, PaymentIntentState, PendingApproval } from '../api/types';
import { useAuth } from '../auth';
import ApprovalNotice from '../components/ApprovalNotice';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Copyable from '../components/Copyable';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import { TextAreaField } from '../components/Field';
import FilterBar, { FilterSelect } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import Modal from '../components/Modal';
import Money from '../components/Money';
import PageHeader from '../components/PageHeader';
import { useBusy, useLoad } from '../hooks';
import { label, options } from '../labels';
import { toast } from '../toast';

const STATES: PaymentIntentState[] = ['CREATED', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED'];
const DIRECTIONS: PaymentDirection[] = ['IN', 'OUT'];
const RECHECKABLE = new Set<PaymentIntentState>(['CREATED', 'PENDING']);
const FORCEABLE = new Set<PaymentIntentState>(['CREATED', 'PENDING', 'FAILED', 'EXPIRED']);

export default function PaymentsPage() {
  const { can } = useAuth();
  const manage = can('payments.manage');
  const f = useFilters({ state: 'PENDING', direction: '' });
  const { state, direction } = f.values;
  const { data, loading, reload } = useLoad(() => api.payments.intents({ state, direction }), [state, direction]);
  const { busy, run } = useBusy();
  const [recheckingId, setRecheckingId] = useState<string | null>(null);

  const [forcing, setForcing] = useState<PaymentIntent | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [approval, setApproval] = useState<PendingApproval | null>(null);

  const recheck = async (p: PaymentIntent) => {
    setRecheckingId(p.id);
    try {
      const res = await run(() => api.payments.recheck(p.id));
      if (res !== undefined) {
        toast.success(res.state === p.state ? `Statut inchangé : ${label('payment', res.state)}.` : `Statut mis à jour : ${label('payment', res.state)}.`);
        reload();
      }
    } finally {
      setRecheckingId(null);
    }
  };

  const submitForce = async () => {
    if (!forcing) return;
    if (reason.trim().length < 5) {
      setReasonError('Indiquez un motif (5 caractères minimum).');
      return;
    }
    const res = await run(() => api.payments.forceComplete(forcing.id, { reason: reason.trim() }));
    if (res === undefined) return;
    setApproval(res);
    setForcing(null);
    setReason('');
    toast.success('Demande d’approbation créée : la complétion forcée sera appliquée après validation.');
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Paiements"
        subtitle="Suivez les dépôts et retraits mobile money des clients, relancez une vérification auprès du fournisseur ou forcez une complétion documentée."
        breadcrumb={[{ label: 'Finance' }, { label: 'Paiements' }]}
      />

      {approval && <ApprovalNotice approval={approval} message="La complétion forcée a été soumise à validation." />}

      <FilterBar active={f.active} onReset={f.reset} onRefresh={reload} refreshing={loading}>
        <FilterSelect label="État" value={state} onChange={(v) => f.set('state', v)} allLabel="Tous les états" options={options('payment', STATES)} />
        <FilterSelect label="Sens" value={direction} onChange={(v) => f.set('direction', v)} allLabel="Dépôts et retraits" options={options('paymentDirection', DIRECTIONS).map((o) => ({ ...o, label: o.value === 'IN' ? 'Dépôts (entrées)' : 'Retraits (sorties)' }))} />
      </FilterBar>

      <div className="card card-table">
        <DataTable<PaymentIntent>
          caption="Intentions de paiement"
          loading={loading}
          rows={data}
          rowKey={(p) => p.id}
          minWidth={900}
          empty={{
            kind: 'money',
            title: f.active ? 'Aucun paiement pour ces filtres' : 'Aucun paiement',
            hint: state === 'PENDING' ? 'Aucun paiement n’attend de confirmation du fournisseur.' : 'Les dépôts et retraits initiés par les clients apparaîtront ici.',
          }}
          columns={[
            { key: 'date', header: 'Créé le', nowrap: true, render: (p) => <DateTime value={p.createdAt} /> },
            {
              key: 'user',
              header: 'Client',
              render: (p) => (
                <>
                  <strong>{p.user?.fullName}</strong>
                  <span className="cell-sub">{p.user?.email}</span>
                </>
              ),
            },
            { key: 'dir', header: 'Sens', render: (p) => <Badge kind="paymentDirection" value={p.direction} /> },
            { key: 'channel', header: 'Canal', priority: 'secondary', render: (p) => <span title={p.channel}>{label('paymentChannel', p.channel)}</span> },
            { key: 'amount', header: 'Montant', align: 'right', numeric: true, render: (p) => <Money value={p.amount} currency={p.currency} /> },
            { key: 'ref', header: 'Référence', priority: 'secondary', render: (p) => <Copyable value={p.reference} short={12} what="la référence" /> },
            { key: 'provider', header: 'Réf. fournisseur', priority: 'detail', render: (p) => <Copyable value={p.providerRef} short={12} what="la référence fournisseur" /> },
            { key: 'msisdn', header: 'Numéro mobile', priority: 'detail', nowrap: true, render: (p) => p.msisdn ?? <span className="muted">—</span> },
            { key: 'state', header: 'État', render: (p) => <Badge kind="payment" value={p.state} /> },
            { key: 'confirmed', header: 'Confirmé le', priority: 'detail', nowrap: true, render: (p) => <DateTime value={p.confirmedAt} /> },
            {
              key: 'actions',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              render: (p) =>
                manage ? (
                  <div className="actions-inline">
                    {RECHECKABLE.has(p.state) && (
                      <Button size="sm" busy={recheckingId === p.id} disabled={busy} onClick={() => void recheck(p)}>
                        Revérifier
                      </Button>
                    )}
                    {FORCEABLE.has(p.state) && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy}
                        onClick={() => {
                          setReason('');
                          setReasonError(null);
                          setForcing(p);
                        }}
                      >
                        Forcer la complétion
                      </Button>
                    )}
                  </div>
                ) : null,
            },
          ]}
        />
      </div>

      {forcing && (
        <Modal
          title="Forcer la complétion"
          description={
            <>
              {forcing.user?.fullName} · {label('paymentDirection', forcing.direction).toLowerCase()} de <Money value={forcing.amount} currency={forcing.currency} /> · référence <span className="mono">{forcing.reference}</span> · état actuel{' '}
              <Badge kind="payment" value={forcing.state} />
            </>
          }
          onClose={() => setForcing(null)}
          footer={
            <>
              <Button onClick={() => setForcing(null)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="danger-solid" onClick={() => void submitForce()} busy={busy}>
                Soumettre la demande
              </Button>
            </>
          }
        >
          <div className="notice notice-warning">
            La complétion forcée crédite ou débite le grand livre du client sans confirmation du fournisseur. À réserver aux cas documentés (reçu opérateur, écart de rapprochement identifié).
          </div>
          <ApprovalNotice />
          <TextAreaField
            label="Motif"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError(null);
            }}
            error={reasonError}
            hint="Citez la pièce justificative (numéro de reçu, référence opérateur)."
            required
            autoFocus
          />
        </Modal>
      )}
    </div>
  );
}
