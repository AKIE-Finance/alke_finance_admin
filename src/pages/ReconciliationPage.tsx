import { useState } from 'react';
import { api } from '../api';
import type { MirrorRow, PendingApproval, ReconciliationItem, ReconciliationState } from '../api/types';
import { useAuth } from '../auth';
import ApprovalNotice from '../components/ApprovalNotice';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Copyable from '../components/Copyable';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import { TextAreaField, TextField } from '../components/Field';
import FilterBar, { FilterSelect } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import Modal from '../components/Modal';
import Money from '../components/Money';
import PageHeader from '../components/PageHeader';
import { formatMoney, formatNumber } from '../format';
import { useBusy, useLoad } from '../hooks';
import { label, options } from '../labels';

const STATES: ReconciliationState[] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'WRITTEN_OFF'];

type Mode = 'INVESTIGATING' | 'RESOLVED' | 'WRITE_OFF';

const MODE_LABELS: Record<Mode, { title: string; button: string; description: string }> = {
  INVESTIGATING: { title: 'Ouvrir une investigation', button: 'Passer en investigation', description: 'L’écart reste ouvert mais est marqué comme pris en charge.' },
  RESOLVED: { title: 'Résoudre l’écart', button: 'Marquer résolu', description: 'L’écart est clos : la différence a été expliquée ou corrigée dans le grand livre.' },
  WRITE_OFF: { title: 'Passer l’écart en perte', button: 'Soumettre la passation en perte', description: 'Le montant est définitivement abandonné. Un second opérateur doit valider.' },
};

function Tile({ label: text, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: 'warn' | 'danger' | 'ok' }) {
  return (
    <div className={`card stat-card ${tone ? `stat-${tone}` : ''}`.trim()}>
      <span className="stat-label">{text}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export default function ReconciliationPage() {
  const { can } = useAuth();
  const edit = can('reconciliation.edit');
  const f = useFilters({ state: 'OPEN' });
  const { state } = f.values;
  const items = useLoad(() => api.reconciliation.list({ state }), [state]);
  const mirror = useLoad(() => api.reconciliation.mirror(), []);
  const metrics = useLoad(() => api.reconciliation.metrics(), []);
  const { busy, run } = useBusy();

  const [target, setTarget] = useState<{ item: ReconciliationItem; mode: Mode } | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [matchedTxnId, setMatchedTxnId] = useState('');
  const [approval, setApproval] = useState<PendingApproval | null>(null);

  const open = (item: ReconciliationItem, mode: Mode) => {
    setReason('');
    setReasonError(null);
    setMatchedTxnId(item.matchedTxnId ?? '');
    setTarget({ item, mode });
  };

  const refreshAll = () => {
    items.reload();
    mirror.reload();
    metrics.reload();
  };

  const submit = async () => {
    if (!target) return;
    if (reason.trim().length < 3) {
      setReasonError('Le motif est obligatoire.');
      return;
    }
    const { item, mode } = target;
    if (mode === 'WRITE_OFF') {
      const res = await run(() => api.reconciliation.writeOff(item.id, { reason: reason.trim() }), 'Demande d’approbation créée : la passation en perte sera appliquée après validation.');
      if (res === undefined) return;
      setApproval(res);
    } else {
      const res = await run(
        () => api.reconciliation.update(item.id, { state: mode, reason: reason.trim(), matchedTxnId: matchedTxnId.trim() || undefined }),
        mode === 'RESOLVED' ? 'Écart résolu.' : 'Écart passé en investigation.',
      );
      if (res === undefined) return;
    }
    setTarget(null);
    refreshAll();
  };

  const m = metrics.data;

  return (
    <div>
      <PageHeader
        title="Rapprochement"
        subtitle="Comparez le grand livre AlKÉ aux relevés des partenaires et des fournisseurs de paiement, puis traitez chaque écart jusqu’à sa résolution."
        breadcrumb={[{ label: 'Finance' }, { label: 'Rapprochement' }]}
      />

      {approval && <ApprovalNotice approval={approval} message="La passation en perte a été soumise à validation." />}

      <div className="grid grid-4">
        <Tile label="Écart miroir (XAF)" value={m ? formatMoney(m.mirrorMismatchXaf, 'XAF') : '…'} sub="Grand livre vs relevé SDB" tone={m && Number(m.mirrorMismatchXaf) !== 0 ? 'danger' : 'ok'} />
        <Tile label="Écarts ouverts" value={m ? formatNumber(m.openReconciliationItems) : '…'} tone={m && m.openReconciliationItems > 0 ? 'warn' : 'ok'} />
        <Tile
          label="Retrait en attente le plus ancien"
          value={m ? (m.oldestPendingWithdrawalHours === null ? '—' : `${formatNumber(m.oldestPendingWithdrawalHours)} h`) : '…'}
          tone={m && (m.oldestPendingWithdrawalHours ?? 0) > 48 ? 'warn' : undefined}
        />
        <Tile label="Latence du dernier ACK" value={m ? (m.ackLatencyMinutesLast === null ? '—' : `${formatNumber(m.ackLatencyMinutesLast)} min`) : '…'} />
      </div>

      <section className="section" aria-labelledby="mirror-title">
        <div className="section-head">
          <h2 id="mirror-title" className="section-title">
            Contrôle miroir du compte espèces clientèle
          </h2>
        </div>
        <div className="card card-table">
          <DataTable<MirrorRow>
            caption="Contrôle miroir par devise"
            loading={mirror.loading}
            rows={mirror.data}
            rowKey={(r) => r.currency}
            empty={{ kind: 'money', title: 'Aucun relevé importé', hint: 'Importez un relevé espèces (CSH) depuis la page Lots SDB pour alimenter le contrôle miroir.' }}
            columns={[
              { key: 'currency', header: 'Devise', render: (r) => <strong>{r.currency}</strong> },
              { key: 'ledger', header: 'Total grand livre', align: 'right', numeric: true, render: (r) => <Money value={r.ledgerTotal} currency={r.currency} /> },
              { key: 'statement', header: 'Solde relevé SDB', align: 'right', numeric: true, render: (r) => <Money value={r.statementBalance} currency={r.currency} /> },
              {
                key: 'diff',
                header: 'Écart',
                align: 'right',
                numeric: true,
                render: (r) => (
                  <span className={Number(r.difference) === 0 ? 'text-ok' : 'text-danger'}>
                    <Money value={r.difference} currency={r.currency} signed />
                  </span>
                ),
              },
              { key: 'asOf', header: 'Arrêté au', priority: 'secondary', nowrap: true, render: (r) => <DateTime value={r.asOf} /> },
            ]}
          />
        </div>
      </section>

      <section className="section" aria-labelledby="items-title">
        <div className="section-head">
          <h2 id="items-title" className="section-title">
            Écarts
          </h2>
        </div>
        <FilterBar active={f.active} onReset={f.reset} onRefresh={refreshAll} refreshing={items.loading}>
          <FilterSelect label="État" value={state} onChange={(v) => f.set('state', v)} allLabel="Tous les états" options={options('reconciliation', STATES)} />
        </FilterBar>
        <div className="card card-table">
          <DataTable<ReconciliationItem>
            caption="Écarts de rapprochement"
            loading={items.loading}
            rows={items.data}
            rowKey={(i) => i.id}
            empty={{
              kind: 'money',
              title: state === 'OPEN' ? 'Aucun écart ouvert' : 'Aucun écart dans cet état',
              hint: state === 'OPEN' ? 'Le grand livre et les relevés importés concordent.' : 'Changez l’état filtré pour consulter d’autres écarts.',
            }}
            columns={[
              { key: 'date', header: 'Date opération', nowrap: true, render: (i) => <DateTime value={i.occurredAt} /> },
              { key: 'source', header: 'Source', render: (i) => <Badge kind="reconciliationSource" value={i.source} /> },
              { key: 'ref', header: 'Référence externe', priority: 'secondary', render: (i) => <Copyable value={i.externalRef} short={14} what="la référence externe" /> },
              { key: 'amount', header: 'Montant', align: 'right', numeric: true, render: (i) => <Money value={i.amount} currency={i.currency} signed /> },
              { key: 'state', header: 'État', render: (i) => <Badge kind="reconciliation" value={i.state} /> },
              { key: 'matched', header: 'Transaction rapprochée', priority: 'detail', render: (i) => <Copyable value={i.matchedTxnId} what="l’identifiant de transaction" /> },
              { key: 'reason', header: 'Motif', priority: 'detail', render: (i) => i.reason ?? <span className="muted">—</span> },
              {
                key: 'actions',
                header: <span className="sr-only">Actions</span>,
                align: 'right',
                render: (i) =>
                  edit && (i.state === 'OPEN' || i.state === 'INVESTIGATING') ? (
                    <div className="actions-inline">
                      {i.state === 'OPEN' && (
                        <Button size="sm" onClick={() => open(i, 'INVESTIGATING')}>
                          Enquêter
                        </Button>
                      )}
                      <Button size="sm" variant="green" onClick={() => open(i, 'RESOLVED')}>
                        Résoudre
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => open(i, 'WRITE_OFF')}>
                        Passer en perte
                      </Button>
                    </div>
                  ) : null,
              },
            ]}
          />
        </div>
      </section>

      {target && (
        <Modal
          title={MODE_LABELS[target.mode].title}
          description={
            <>
              {label('reconciliationSource', target.item.source)} · <span className="mono">{target.item.externalRef}</span> · <Money value={target.item.amount} currency={target.item.currency} signed /> · état actuel{' '}
              <Badge kind="reconciliation" value={target.item.state} />
            </>
          }
          onClose={() => setTarget(null)}
          footer={
            <>
              <Button onClick={() => setTarget(null)} disabled={busy}>
                Annuler
              </Button>
              <Button variant={target.mode === 'WRITE_OFF' ? 'danger-solid' : 'primary'} onClick={() => void submit()} busy={busy}>
                {MODE_LABELS[target.mode].button}
              </Button>
            </>
          }
        >
          <p className={`confirm-message ${target.mode === 'WRITE_OFF' ? 'confirm-danger' : ''}`.trim()}>{MODE_LABELS[target.mode].description}</p>
          {target.mode === 'WRITE_OFF' && <ApprovalNotice />}
          {target.mode !== 'WRITE_OFF' && (
            <TextField
              label="Transaction rapprochée"
              value={matchedTxnId}
              onChange={(e) => setMatchedTxnId(e.target.value)}
              hint={target.mode === 'RESOLVED' ? 'Identifiant de l’écriture du grand livre correspondante, si connue. Optionnel.' : 'Optionnel.'}
              className="mono"
            />
          )}
          <TextAreaField
            label="Motif"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError(null);
            }}
            error={reasonError}
            required
            autoFocus
            hint="Tracé dans le journal d’audit."
          />
        </Modal>
      )}
    </div>
  );
}
