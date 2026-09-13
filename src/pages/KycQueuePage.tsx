import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { isApproval, type KycCase, type PendingApproval, type ScreeningResult } from '../api/types';
import { useAuth } from '../auth';
import ApprovalNotice from '../components/ApprovalNotice';
import Badge from '../components/Badge';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import { SelectField, TextAreaField } from '../components/Field';
import FilterBar, { FilterSelect } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import Icon from '../components/icons';
import JsonView from '../components/JsonView';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { DefinitionGrid } from '../components/Section';
import { formatNumber } from '../format';
import { useBusy, useLoad } from '../hooks';
import { label, options } from '../labels';
import { toast } from '../toast';

const STATUSES = ['MANUAL_REVIEW', 'SUBMITTED', 'AUTO_APPROVED', 'VALIDATED', 'REJECTED', 'RE_KYC'];
const PRIORITY: Record<string, number> = { MANUAL_REVIEW: 0, SUBMITTED: 1, RE_KYC: 2 };

/** Heuristique : le screening signale-t-il une PEP ou une correspondance sanctions ? */
export function hasScreeningHit(r: ScreeningResult | null | undefined): boolean {
  if (!r) return false;
  if (r.pep === true || r.sanctions === true || r.hit === true) return true;
  if (Array.isArray(r.matches) && r.matches.length > 0) return true;
  const status = typeof r.status === 'string' ? r.status.toUpperCase() : '';
  return status === 'HIT' || status === 'MATCH' || status === 'PEP';
}

function DocLink({ href, label: text }: { href: string | null | undefined; label: string }) {
  if (!href) return <span className="muted">{text} : indisponible</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="doc-link">
      {text} <Icon name="external" size={12} />
    </a>
  );
}

export default function KycQueuePage() {
  const { can } = useAuth();
  const f = useFilters({ status: '' });
  const { status } = f.values;
  const { data, loading, reload } = useLoad(() => api.kyc.queue({ status }), [status]);
  const [selected, setSelected] = useState<KycCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decision, setDecision] = useState<'VALIDATED' | 'REJECTED'>('VALIDATED');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [approval, setApproval] = useState<PendingApproval | null>(null);
  const { busy, run } = useBusy();

  const rows = useMemo(() => {
    const list = [...(data ?? [])];
    list.sort((a, b) => {
      const pa = PRIORITY[a.status] ?? 9;
      const pb = PRIORITY[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      return (a.submittedAt ?? '').localeCompare(b.submittedAt ?? '');
    });
    return list;
  }, [data]);

  const open = async (c: KycCase) => {
    setSelected(c);
    setDecision('VALIDATED');
    setReason('');
    setReasonError(null);
    setApproval(null);
    setDetailLoading(true);
    try {
      const full = await api.kyc.get(c.id);
      setSelected(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de charger le dossier.');
    } finally {
      setDetailLoading(false);
    }
  };

  const submitDecision = async () => {
    if (!selected) return;
    if (decision === 'REJECTED' && !reason.trim()) {
      setReasonError('Un motif est obligatoire pour un rejet : il est communiqué au client.');
      return;
    }
    const res = await run(() => api.kyc.decide(selected.id, { decision, reason: reason.trim() || undefined }));
    if (res === undefined) return;
    if (isApproval(res)) {
      setApproval(res.approval);
      toast.success('Demande d’approbation créée : la décision sera appliquée après validation à deux yeux.');
    } else {
      toast.success(decision === 'VALIDATED' ? 'Dossier KYC validé.' : 'Dossier KYC rejeté.');
      setSelected(null);
    }
    reload();
  };

  const hit = hasScreeningHit(selected?.screeningResult);
  const decidable = selected && ['MANUAL_REVIEW', 'SUBMITTED', 'RE_KYC'].includes(selected.status);

  return (
    <div>
      <PageHeader title="File KYC" subtitle="Examinez les pièces d’identité des clients en attente et validez ou rejetez chaque dossier, les revues manuelles en premier." breadcrumb={[{ label: 'Clients' }, { label: 'File KYC' }]} />

      <FilterBar active={f.active} onReset={f.reset} onRefresh={reload} refreshing={loading}>
        <FilterSelect label="Statut" value={status} onChange={(v) => f.set('status', v)} allLabel="File complète" options={options('kyc', STATUSES)} wide />
      </FilterBar>

      <div className="card card-table">
        <DataTable<KycCase>
          caption="File d’attente KYC"
          loading={loading}
          rows={rows}
          rowKey={(c) => c.id}
          onRowClick={(c) => void open(c)}
          empty={{
            kind: 'documents',
            title: f.active ? 'Aucun dossier dans ce statut' : 'Aucun dossier à examiner',
            hint: f.active ? 'Changez le statut filtré ou revenez à la file complète.' : 'Les dossiers soumis par les clients apparaîtront ici, revues manuelles en tête.',
          }}
          columns={[
            { key: 'submitted', header: 'Soumis le', nowrap: true, render: (c) => <DateTime value={c.submittedAt} /> },
            {
              key: 'user',
              header: 'Client',
              render: (c) => (
                <>
                  <strong>{c.user.fullName}</strong>
                  <span className="cell-sub">
                    {c.user.email} · {label('country', c.user.country)}
                  </span>
                </>
              ),
            },
            { key: 'doc', header: 'Document', priority: 'secondary', render: (c) => `${c.documentType ?? '—'}${c.documentCountry ? ` (${label('country', c.documentCountry)})` : ''}` },
            { key: 'liveness', header: 'Vivacité', align: 'right', numeric: true, priority: 'detail', render: (c) => (c.livenessScore === null ? '—' : formatNumber(c.livenessScore)) },
            {
              key: 'screening',
              header: 'Screening',
              priority: 'secondary',
              render: (c) => (hasScreeningHit(c.screeningResult) ? <Badge tone="danger" value="HIT" label="PEP / sanctions" /> : <Badge tone="success" value="OK" label="RAS" />),
            },
            { key: 'status', header: 'Statut', render: (c) => <Badge kind="kyc" value={c.status} /> },
          ]}
        />
      </div>

      {selected && (
        <Modal
          title={`Dossier KYC — ${selected.user.fullName}`}
          description={
            <>
              {selected.user.email} · {selected.user.phone} · {label('country', selected.user.country)} · <Link to={`/users/${selected.userId}`}>Fiche client</Link>
            </>
          }
          onClose={() => setSelected(null)}
          width={680}
        >
          {detailLoading && (
            <p className="muted small" role="status">
              Chargement des pièces…
            </p>
          )}
          <DefinitionGrid
            items={[
              { label: 'Statut', value: <Badge kind="kyc" value={selected.status} /> },
              { label: 'Document', value: `${selected.documentType ?? '—'}${selected.documentCountry ? ` (${label('country', selected.documentCountry)})` : ''}` },
              { label: 'Soumis le', value: <DateTime value={selected.submittedAt} /> },
              { label: 'Score de vivacité', value: selected.livenessScore === null ? '—' : formatNumber(selected.livenessScore) },
            ]}
          />

          <h4 className="standalone-title">Pièces justificatives</h4>
          <div className="doc-links">
            <DocLink href={selected.documentFrontUrl} label="Document — recto" />
            <DocLink href={selected.documentBackUrl} label="Document — verso" />
            <DocLink href={selected.selfieUrl} label="Selfie" />
          </div>

          <h4 className="standalone-title">Screening sanctions / PEP</h4>
          {hit ? <div className="notice notice-danger">Correspondance détectée (personne politiquement exposée ou liste de sanctions).</div> : <div className="notice">Aucune correspondance signalée.</div>}
          <JsonView value={selected.screeningResult} maxHeight={180} />

          {approval && <ApprovalNotice approval={approval} />}

          {decidable && can('kyc.decide') && !approval && (
            <>
              <h4 className="standalone-title">Décision</h4>
              <SelectField label="Décision" value={decision} onChange={(e) => setDecision(e.target.value as 'VALIDATED' | 'REJECTED')} required>
                <option value="VALIDATED">Valider le dossier</option>
                <option value="REJECTED">Rejeter le dossier</option>
              </SelectField>
              <TextAreaField
                label={decision === 'REJECTED' ? 'Motif du rejet' : 'Commentaire'}
                hint={decision === 'REJECTED' ? 'Communiqué au client dans l’application.' : 'Optionnel, conservé dans le dossier.'}
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReasonError(null);
                }}
                error={reasonError}
                required={decision === 'REJECTED'}
              />
              {hit && <ApprovalNotice message="Correspondance PEP / sanctions : la décision sera soumise à validation à deux yeux." />}
              <div className="actions">
                <Button variant={decision === 'REJECTED' ? 'danger-solid' : 'green'} busy={busy} onClick={() => void submitDecision()}>
                  {decision === 'REJECTED' ? 'Rejeter le dossier' : 'Valider le dossier'}
                </Button>
                <Button onClick={() => setSelected(null)}>Fermer</Button>
              </div>
            </>
          )}
          {selected.decisionReason && <p className="muted small mt-3">Motif : {selected.decisionReason}</p>}
        </Modal>
      )}
    </div>
  );
}
