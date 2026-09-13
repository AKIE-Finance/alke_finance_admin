import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { AlertSeverity, AlertStatus, ComplianceAlert, ComplianceCase, ComplianceCaseState, PendingApproval } from '../api/types';
import { useAuth } from '../auth';
import ApprovalNotice from '../components/ApprovalNotice';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Copyable from '../components/Copyable';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import Drawer from '../components/Drawer';
import EmptyState from '../components/EmptyState';
import { SelectField, TextAreaField, TextField } from '../components/Field';
import FilterBar, { FilterSelect, FilterText } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import JsonView from '../components/JsonView';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { DefinitionGrid } from '../components/Section';
import { currentMonth, shortId } from '../format';
import { useBusy, useLoad } from '../hooks';
import { options } from '../labels';

const ALERT_STATUSES: AlertStatus[] = ['OPEN', 'ATTACHED', 'DISMISSED'];
const SEVERITIES: AlertSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CASE_STATES: ComplianceCaseState[] = ['OPEN', 'UNDER_REVIEW', 'ESCALATED', 'CLEARED', 'REPORTED', 'CLOSED'];
const DECISIONS = ['CLEARED', 'ESCALATED', 'REPORTED', 'CLOSED'];
const DECIDABLE = new Set<ComplianceCaseState>(['OPEN', 'UNDER_REVIEW', 'ESCALATED']);

export default function CompliancePage() {
  const { can } = useAuth();
  const manage = can('compliance.manage');
  const [params, setParams] = useSearchParams();
  const caseId = params.get('case') ?? '';
  const selectCase = (id: string | null) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (id) p.set('case', id);
      else p.delete('case');
      return p;
    });

  const f = useFilters({ alertStatus: 'OPEN', severity: '', caseState: '' });
  const { alertStatus, severity, caseState } = f.values;
  const alerts = useLoad(() => api.compliance.alerts({ status: alertStatus, severity }), [alertStatus, severity]);
  const cases = useLoad(() => api.compliance.cases({ state: caseState }), [caseState]);
  const detail = useLoad(() => (caseId ? api.compliance.getCase(caseId) : Promise.resolve(undefined)), [caseId]);
  const { busy, run } = useBusy();
  const exporting = useBusy();

  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', subjectUserId: '' });
  const [createError, setCreateError] = useState<string | null>(null);
  const [month, setMonth] = useState(currentMonth());

  const [noteBody, setNoteBody] = useState('');
  const [decision, setDecision] = useState('CLEARED');
  const [decisionReason, setDecisionReason] = useState('');
  const [reportRef, setReportRef] = useState('');
  const [decisionErrors, setDecisionErrors] = useState<Record<string, string>>({});
  const [approval, setApproval] = useState<PendingApproval | null>(null);

  const alertById = useMemo(() => new Map((alerts.data ?? []).map((a) => [a.id, a])), [alerts.data]);

  const toggleAlert = (id: string) =>
    setSelectedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openCreate = () => {
    const first = [...selectedAlerts].map((id) => alertById.get(id)).find((a) => a?.userId);
    setCreateForm({ title: '', subjectUserId: first?.userId ?? '' });
    setCreateError(null);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!createForm.title.trim()) {
      setCreateError('Le titre du dossier est obligatoire.');
      return;
    }
    const res = await run(() => api.compliance.createCase({ title: createForm.title.trim(), subjectUserId: createForm.subjectUserId.trim() || undefined, alertIds: [...selectedAlerts] }), 'Dossier de conformité ouvert.');
    if (res === undefined) return;
    setCreateOpen(false);
    setSelectedAlerts(new Set());
    alerts.reload();
    cases.reload();
    selectCase(res.id);
  };

  const openCase = (c: ComplianceCase | string) => {
    setNoteBody('');
    setDecision('CLEARED');
    setDecisionReason('');
    setReportRef('');
    setDecisionErrors({});
    setApproval(null);
    selectCase(typeof c === 'string' ? c : c.id);
  };

  const addNote = async () => {
    if (!caseId || noteBody.trim().length < 2) return;
    const res = await run(() => api.compliance.addNote(caseId, { body: noteBody.trim() }), 'Note ajoutée.');
    if (res === undefined) return;
    setNoteBody('');
    detail.reload();
  };

  const submitDecision = async () => {
    if (!caseId) return;
    const e: Record<string, string> = {};
    if (decisionReason.trim().length < 5) e.reason = 'Le motif de la décision est obligatoire (5 caractères minimum).';
    if (decision === 'REPORTED' && !reportRef.trim()) e.reportRef = 'La référence de la déclaration réglementaire est obligatoire.';
    setDecisionErrors(e);
    if (Object.keys(e).length > 0) return;
    const res = await run(() => api.compliance.decide(caseId, { decision, reason: decisionReason.trim(), regulatoryReportRef: reportRef.trim() || undefined }), 'Décision soumise à validation à deux yeux.');
    if (res === undefined) return;
    setApproval(res);
    cases.reload();
    detail.reload();
  };

  const exportCsv = () => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    void exporting.run(() => api.compliance.exportCsv(month), `Export conformité ${month} téléchargé.`);
  };

  const c = detail.data;

  return (
    <div>
      <PageHeader
        title="Conformité"
        subtitle="Qualifiez les alertes de surveillance, regroupez-les en dossiers d’investigation et prenez les décisions à déclarer au régulateur."
        breadcrumb={[{ label: 'Contrôle' }, { label: 'Conformité' }]}
        actions={
          <div className="row">
            <FilterText label="Mois d’export" type="month" value={month} onChange={setMonth} debounce={0} />
            <Button onClick={exportCsv} busy={exporting.busy} disabled={!/^\d{4}-\d{2}$/.test(month)}>
              Exporter le CSV mensuel
            </Button>
          </div>
        }
      />

      <section className="section section-first" aria-labelledby="alerts-title">
        <div className="section-head">
          <h2 id="alerts-title" className="section-title">
            Alertes
          </h2>
        </div>
        <FilterBar
          active={alertStatus !== 'OPEN' || severity !== ''}
          onReset={() => {
            f.set('alertStatus', 'OPEN');
            f.set('severity', '');
          }}
          onRefresh={alerts.reload}
          refreshing={alerts.loading}
          actions={
            manage ? (
              <Button variant="primary" onClick={openCreate} disabled={selectedAlerts.size === 0}>
                Ouvrir un dossier{selectedAlerts.size > 0 ? ` (${selectedAlerts.size})` : ''}
              </Button>
            ) : undefined
          }
        >
          <FilterSelect label="Statut" value={alertStatus} onChange={(v) => f.set('alertStatus', v)} allLabel="Tous les statuts" options={options('alert', ALERT_STATUSES)} />
          <FilterSelect label="Gravité" value={severity} onChange={(v) => f.set('severity', v)} allLabel="Toutes les gravités" options={options('severity', SEVERITIES)} />
        </FilterBar>
        <div className="card card-table">
          <DataTable<ComplianceAlert>
            caption="Alertes de conformité"
            loading={alerts.loading}
            rows={alerts.data}
            rowKey={(a) => a.id}
            empty={{
              kind: 'shield',
              title: alertStatus === 'OPEN' ? 'Aucune alerte ouverte' : 'Aucune alerte pour ces filtres',
              hint: alertStatus === 'OPEN' ? 'Les alertes générées par la surveillance des opérations apparaîtront ici pour qualification.' : 'Changez le statut ou la gravité filtrés.',
            }}
            columns={[
              ...(manage
                ? [
                    {
                      key: 'select',
                      header: <span className="sr-only">Sélection</span>,
                      width: 36,
                      render: (a: ComplianceAlert) =>
                        a.status === 'OPEN' ? <input type="checkbox" aria-label={`Sélectionner l’alerte ${shortId(a.id)}`} checked={selectedAlerts.has(a.id)} onChange={() => toggleAlert(a.id)} /> : null,
                    },
                  ]
                : []),
              { key: 'date', header: 'Date', nowrap: true, render: (a) => <DateTime value={a.createdAt} /> },
              { key: 'severity', header: 'Gravité', render: (a) => <Badge kind="severity" value={a.severity} /> },
              { key: 'status', header: 'Statut', render: (a) => <Badge kind="alert" value={a.status} /> },
              { key: 'source', header: 'Source', priority: 'detail', render: (a) => a.source },
              { key: 'summary', header: 'Résumé', render: (a) => a.summary },
              {
                key: 'user',
                header: 'Client',
                priority: 'secondary',
                render: (a) =>
                  a.user ? (
                    <Link to={`/users/${a.userId}`}>{a.user.fullName}</Link>
                  ) : a.userId ? (
                    <Link to={`/users/${a.userId}`} className="mono">
                      {shortId(a.userId)}
                    </Link>
                  ) : (
                    <span className="muted">—</span>
                  ),
              },
              {
                key: 'case',
                header: 'Dossier',
                align: 'right',
                render: (a) =>
                  a.caseId ? (
                    <Button size="sm" onClick={() => openCase(a.caseId!)}>
                      Voir
                    </Button>
                  ) : (
                    <span className="muted">—</span>
                  ),
              },
            ]}
          />
        </div>
      </section>

      <section className="section" aria-labelledby="cases-title">
        <div className="section-head">
          <h2 id="cases-title" className="section-title">
            Dossiers
          </h2>
        </div>
        <FilterBar active={caseState !== ''} onReset={() => f.set('caseState', '')} onRefresh={cases.reload} refreshing={cases.loading}>
          <FilterSelect label="État du dossier" value={caseState} onChange={(v) => f.set('caseState', v)} allLabel="Tous les états" options={options('complianceCase', CASE_STATES)} />
        </FilterBar>
        <div className="card card-table">
          <DataTable<ComplianceCase>
            caption="Dossiers de conformité"
            loading={cases.loading}
            rows={cases.data}
            rowKey={(x) => x.id}
            onRowClick={openCase}
            empty={{ kind: 'shield', title: 'Aucun dossier', hint: 'Sélectionnez une ou plusieurs alertes ouvertes puis « Ouvrir un dossier » pour démarrer une investigation.' }}
            columns={[
              { key: 'ref', header: 'Référence', render: (x) => <strong>{x.reference}</strong> },
              { key: 'title', header: 'Titre', render: (x) => x.title },
              { key: 'subject', header: 'Client concerné', priority: 'secondary', render: (x) => x.subject?.fullName ?? (x.subjectUserId ? <span className="mono">{shortId(x.subjectUserId)}</span> : <span className="muted">—</span>) },
              { key: 'state', header: 'État', render: (x) => <Badge kind="complianceCase" value={x.state} /> },
              { key: 'opened', header: 'Ouvert le', priority: 'secondary', nowrap: true, render: (x) => <DateTime value={x.openedAt} /> },
              { key: 'closed', header: 'Clos le', priority: 'detail', nowrap: true, render: (x) => <DateTime value={x.closedAt} /> },
            ]}
          />
        </div>
      </section>

      {caseId && (
        <Drawer title={c ? `${c.reference} — ${c.title}` : 'Dossier'} onClose={() => selectCase(null)}>
          {detail.loading && !c && (
            <div aria-busy="true" className="stack">
              <span className="skeleton skeleton-block" />
              <span className="skeleton skeleton-block" style={{ width: '70%' }} />
              <span className="skeleton skeleton-block" style={{ width: '50%' }} />
            </div>
          )}
          {!detail.loading && !c && <EmptyState kind="shield" title="Dossier introuvable" hint="Il a peut-être été supprimé ou l’identifiant est incorrect." />}
          {c && (
            <>
              <DefinitionGrid
                items={[
                  { label: 'État', value: <Badge kind="complianceCase" value={c.state} /> },
                  {
                    label: 'Client concerné',
                    value: c.subjectUserId ? (
                      <>
                        <Link to={`/users/${c.subjectUserId}`}>{c.subject?.fullName ?? shortId(c.subjectUserId)}</Link>
                        {c.subject?.email && <span className="sub">{c.subject.email}</span>}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    ),
                  },
                  { label: 'Ouvert le', value: <DateTime value={c.openedAt} /> },
                  { label: 'Clos le', value: <DateTime value={c.closedAt} /> },
                ]}
              />

              <section className="section" aria-label="Alertes rattachées">
                <div className="section-head">
                  <h2 className="section-title">
                    Alertes rattachées <span className="section-count">{c.alerts?.length ?? 0}</span>
                  </h2>
                </div>
                {(c.alerts ?? []).length === 0 && <p className="section-empty-row">Aucune alerte rattachée.</p>}
                {(c.alerts ?? []).map((a) => (
                  <details key={a.id} className="mb-2">
                    <summary>
                      <Badge kind="severity" value={a.severity} /> {a.summary} <span className="muted small">· {a.source}</span>
                    </summary>
                    <JsonView value={a.details} maxHeight={160} />
                  </details>
                ))}
              </section>

              <section className="section" aria-label="Notes">
                <div className="section-head">
                  <h2 className="section-title">
                    Notes <span className="section-count">{c.notes?.length ?? 0}</span>
                  </h2>
                </div>
                {(c.notes ?? []).length === 0 ? (
                  <p className="section-empty-row">Aucune note.</p>
                ) : (
                  <ul className="plain-list">
                    {(c.notes ?? []).map((n) => (
                      <li key={n.id}>
                        <div className="muted small">
                          {n.author?.fullName ?? shortId(n.authorId)} · <DateTime value={n.createdAt} />
                        </div>
                        <div className="pre-wrap">{n.body}</div>
                      </li>
                    ))}
                  </ul>
                )}
                {manage && (
                  <div className="mt-3">
                    <TextAreaField label="Ajouter une note" rows={3} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} hint="Horodatée et signée de votre nom." />
                    <Button size="sm" onClick={() => void addNote()} busy={busy} disabled={noteBody.trim().length < 2}>
                      Ajouter la note
                    </Button>
                  </div>
                )}
              </section>

              {(c.decisions ?? []).length > 0 && (
                <section className="section" aria-label="Décisions">
                  <div className="section-head">
                    <h2 className="section-title">
                      Décisions <span className="section-count">{c.decisions?.length ?? 0}</span>
                    </h2>
                  </div>
                  <ul className="plain-list">
                    {(c.decisions ?? []).map((d) => (
                      <li key={d.id} className="row">
                        <Badge kind="complianceDecision" value={d.decision} />
                        <span>
                          par {d.decidedBy?.fullName ?? shortId(d.decidedById)} le <DateTime value={d.decidedAt} />
                        </span>
                        {d.regulatoryReportRef && (
                          <span className="muted small">
                            · réf. déclaration <Copyable value={d.regulatoryReportRef} short={0} what="la référence de déclaration" />
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {manage && DECIDABLE.has(c.state) && (
                <section className="section" aria-label="Décision">
                  <div className="section-head">
                    <h2 className="section-title">Décision</h2>
                  </div>
                  {approval ? (
                    <ApprovalNotice approval={approval} />
                  ) : (
                    <>
                      <ApprovalNotice />
                      <SelectField label="Décision" value={decision} onChange={(e) => setDecision(e.target.value)} required>
                        {options('complianceDecision', DECISIONS).map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </SelectField>
                      {decision === 'REPORTED' && (
                        <TextField label="Référence de la déclaration réglementaire" value={reportRef} onChange={(e) => setReportRef(e.target.value)} error={decisionErrors.reportRef} required hint="Numéro attribué par l’ANIF / le régulateur." />
                      )}
                      <TextAreaField label="Motif" rows={3} value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} error={decisionErrors.reason} required hint="Tracé dans le journal d’audit et visible du valideur." />
                      <Button variant="primary" onClick={() => void submitDecision()} busy={busy}>
                        Soumettre la décision
                      </Button>
                    </>
                  )}
                </section>
              )}
            </>
          )}
        </Drawer>
      )}

      {createOpen && (
        <Modal
          title="Ouvrir un dossier"
          description={`${selectedAlerts.size} alerte${selectedAlerts.size > 1 ? 's' : ''} sélectionnée${selectedAlerts.size > 1 ? 's' : ''} sera rattachée au dossier.`}
          onClose={() => setCreateOpen(false)}
          footer={
            <>
              <Button onClick={() => setCreateOpen(false)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="primary" onClick={() => void submitCreate()} busy={busy}>
                Ouvrir le dossier
              </Button>
            </>
          }
        >
          <TextField
            label="Titre du dossier"
            value={createForm.title}
            onChange={(e) => {
              setCreateForm({ ...createForm, title: e.target.value });
              setCreateError(null);
            }}
            error={createError}
            required
            autoFocus
          />
          <TextField label="Identifiant du client concerné" value={createForm.subjectUserId} onChange={(e) => setCreateForm({ ...createForm, subjectUserId: e.target.value })} hint="Optionnel, pré-rempli depuis la première alerte sélectionnée." className="mono" />
        </Modal>
      )}
    </div>
  );
}
