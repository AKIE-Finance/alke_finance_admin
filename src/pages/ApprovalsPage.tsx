import { useState } from 'react';
import { api } from '../api';
import type { ApprovalState, PendingApproval } from '../api/types';
import { useAuth } from '../auth';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Copyable from '../components/Copyable';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import { TextAreaField } from '../components/Field';
import FilterBar, { FilterSelect, FilterText } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import JsonView from '../components/JsonView';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { DefinitionGrid } from '../components/Section';
import { useBusy, useLoad } from '../hooks';
import { label, options } from '../labels';
import { toast } from '../toast';

const STATES: ApprovalState[] = ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'];
const SELF_APPROVAL_MSG = 'Un demandeur ne peut pas valider sa propre action';

export default function ApprovalsPage() {
  const { can, user } = useAuth();
  const decide = can('approvals.decide');
  const f = useFilters({ state: 'PENDING', actionType: '' });
  const { state, actionType } = f.values;
  const { data, loading, reload } = useLoad(() => api.approvals.list({ state, actionType }), [state, actionType]);
  const { busy, run } = useBusy();

  const [selected, setSelected] = useState<PendingApproval | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);

  const open = (a: PendingApproval) => {
    setNote('');
    setNoteError(null);
    setSelected(a);
  };

  const isOwn = (a: PendingApproval) => Boolean(a.maker?.id && user && a.maker.id === user.id);

  const approve = async () => {
    if (!selected) return;
    if (isOwn(selected)) {
      toast.error(`${SELF_APPROVAL_MSG}.`);
      return;
    }
    const res = await run(() => api.approvals.approve(selected.id, { note: note.trim() || undefined }));
    if (res === undefined) return;
    toast.success(res.state === 'EXECUTED' ? 'Action approuvée et exécutée.' : res.state === 'FAILED' ? `Approuvée mais l’exécution a échoué : ${res.error ?? 'erreur inconnue'}` : 'Action approuvée.');
    setSelected(null);
    reload();
  };

  const reject = async () => {
    if (!selected) return;
    if (note.trim().length < 3) {
      setNoteError('Un motif est obligatoire pour rejeter une demande.');
      return;
    }
    const res = await run(() => api.approvals.reject(selected.id, { note: note.trim() }), 'Demande rejetée.');
    if (res === undefined) return;
    setSelected(null);
    reload();
  };

  const emptyTitle = state === 'PENDING' ? 'Rien à valider' : 'Aucune demande dans cet état';
  const emptyHint = state === 'PENDING' ? 'Les demandes apparaîtront ici avec le nom du demandeur.' : 'Changez l’état filtré pour consulter d’autres demandes.';

  return (
    <div>
      <PageHeader
        title="Approbations"
        subtitle="Validez ou rejetez les actions sensibles demandées par un autre opérateur : blocages, décisions KYC, revues d’ordres, frais, configuration."
        breadcrumb={[{ label: 'Pilotage' }, { label: 'Approbations' }]}
      />

      <FilterBar active={f.active} onReset={f.reset} onRefresh={reload} refreshing={loading}>
        <FilterSelect label="État" value={state} onChange={(v) => f.set('state', v)} allLabel="Tous les états" options={options('approval', STATES)} />
        <FilterText label="Type d’action" placeholder="ex. USER_UNBLOCK" value={actionType} onChange={(v) => f.set('actionType', v)} wide />
      </FilterBar>

      <div className="card card-table">
        <DataTable<PendingApproval>
          caption="Demandes d’approbation"
          loading={loading}
          rows={data}
          rowKey={(a) => a.id}
          empty={{ kind: 'inbox', title: emptyTitle, hint: emptyHint }}
          onRowClick={open}
          columns={[
            { key: 'date', header: 'Créée le', nowrap: true, render: (a) => <DateTime value={a.createdAt} /> },
            {
              key: 'type',
              header: 'Action',
              render: (a) => (
                <>
                  <strong>{label('approvalAction', a.actionType)}</strong>
                  <span className="cell-sub mono">{a.actionType}</span>
                </>
              ),
            },
            {
              key: 'entity',
              header: 'Entité',
              priority: 'secondary',
              render: (a) =>
                a.entityType ? (
                  <>
                    {a.entityType} <Copyable value={a.entityId} what="l’identifiant de l’entité" />
                  </>
                ) : (
                  <span className="muted">—</span>
                ),
            },
            { key: 'reason', header: 'Motif', priority: 'detail', render: (a) => <span title={a.reason}>{a.reason.length > 60 ? `${a.reason.slice(0, 60)}…` : a.reason}</span> },
            {
              key: 'maker',
              header: 'Demandeur',
              render: (a) => (
                <>
                  {a.maker?.fullName ?? '—'}
                  {isOwn(a) && <span className="badge badge-you ml-2">vous</span>}
                </>
              ),
            },
            { key: 'checker', header: 'Valideur', priority: 'detail', render: (a) => a.checker?.fullName ?? <span className="muted">—</span> },
            { key: 'state', header: 'État', render: (a) => <Badge kind="approval" value={a.state} /> },
            { key: 'decided', header: 'Décidée le', priority: 'detail', nowrap: true, render: (a) => <DateTime value={a.decidedAt} /> },
          ]}
        />
      </div>

      {selected && (
        <Modal
          title={label('approvalAction', selected.actionType)}
          description={
            <>
              Demande <Copyable value={selected.id} what="l’identifiant de la demande" /> · <Badge kind="approval" value={selected.state} />
            </>
          }
          onClose={() => setSelected(null)}
          width={680}
          footer={
            selected.state === 'PENDING' && decide ? (
              <>
                <Button onClick={() => setSelected(null)} disabled={busy}>
                  Fermer
                </Button>
                <Button variant="danger-solid" onClick={() => void reject()} busy={busy}>
                  Rejeter
                </Button>
                <Button variant="green" onClick={() => void approve()} busy={busy} disabled={isOwn(selected)} title={isOwn(selected) ? SELF_APPROVAL_MSG : undefined}>
                  Approuver
                </Button>
              </>
            ) : (
              <Button onClick={() => setSelected(null)}>Fermer</Button>
            )
          }
        >
          <DefinitionGrid
            items={[
              {
                label: 'Demandeur',
                value: (
                  <>
                    {selected.maker?.fullName ?? '—'} {isOwn(selected) && <span className="badge badge-you">vous</span>}
                    <span className="sub">
                      <DateTime value={selected.createdAt} />
                    </span>
                  </>
                ),
              },
              {
                label: 'Valideur',
                value: (
                  <>
                    {selected.checker?.fullName ?? <span className="muted">—</span>}
                    <span className="sub">
                      <DateTime value={selected.decidedAt} />
                    </span>
                  </>
                ),
              },
              {
                label: 'Entité',
                value: selected.entityType ? (
                  <>
                    {selected.entityType} <Copyable value={selected.entityId} what="l’identifiant de l’entité" />
                  </>
                ) : (
                  <span className="muted">—</span>
                ),
              },
              { label: 'Exécutée le', value: <DateTime value={selected.executedAt} /> },
            ]}
          />
          <div className="stat-label mt-4">Motif du demandeur</div>
          <p className="mt-1">{selected.reason}</p>
          {selected.decisionNote && (
            <>
              <div className="stat-label mt-3">Note du valideur</div>
              <p className="mt-1">{selected.decisionNote}</p>
            </>
          )}
          {selected.error && <div className="notice notice-danger">Erreur d’exécution : {selected.error}</div>}
          <div className="stat-label mt-3">Charge utile</div>
          <JsonView value={selected.payload} maxHeight={240} />

          {selected.state === 'PENDING' && decide && (
            <>
              {isOwn(selected) && <div className="notice notice-warning">{SELF_APPROVAL_MSG}. Un autre opérateur doit valider cette demande.</div>}
              <TextAreaField
                label="Note de décision"
                hint="Optionnelle pour approuver, obligatoire pour rejeter."
                rows={3}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setNoteError(null);
                }}
                error={noteError}
              />
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
