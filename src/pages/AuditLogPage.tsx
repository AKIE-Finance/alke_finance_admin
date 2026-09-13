import { useState } from 'react';
import { api } from '../api';
import type { AuditEntry, AuditVerifyResult } from '../api/types';
import Button from '../components/Button';
import Copyable from '../components/Copyable';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import FilterBar, { FilterText } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import PageHeader from '../components/PageHeader';
import { useBusy, useLoad } from '../hooks';
import { label } from '../labels';

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const f = useFilters({ entityType: '', action: '', from: '', to: '' });
  const { entityType, action, from, to } = f.values;
  const page = f.page;
  const { data, loading, reload } = useLoad(() => api.audit.list({ entityType, action, from, to, page, pageSize: PAGE_SIZE }), [entityType, action, from, to, page]);
  const verifying = useBusy();
  const [verify, setVerify] = useState<AuditVerifyResult | null>(null);

  const runVerify = async () => {
    const res = await verifying.run(() => api.audit.verify());
    if (res !== undefined) setVerify(res);
  };

  return (
    <div>
      <PageHeader
        title="Journal d’audit"
        subtitle="Retrouvez qui a fait quoi et quand : chaque opération sensible est enregistrée et chaînée à la précédente, ce qui rend toute altération détectable."
        breadcrumb={[{ label: 'Contrôle' }, { label: 'Journal d’audit' }]}
        actions={
          <Button variant="primary" onClick={() => void runVerify()} busy={verifying.busy}>
            Vérifier l’intégrité de la chaîne
          </Button>
        }
      />

      {verify && (
        <div className={`notice ${verify.ok ? 'notice-success' : 'notice-danger'}`} role="status">
          <div>
            {verify.ok ? (
              <>
                <strong>Chaîne intègre.</strong> {verify.checked} entrée{verify.checked > 1 ? 's' : ''} vérifiée{verify.checked > 1 ? 's' : ''}.
              </>
            ) : (
              <>
                <strong>Rupture de chaîne détectée</strong> — {verify.checked} entrée(s) vérifiée(s)
                {verify.brokenAtSeq !== undefined && verify.brokenAtSeq !== null && (
                  <>
                    , rupture à la séquence <code>{String(verify.brokenAtSeq)}</code>
                  </>
                )}
                . Alertez immédiatement le responsable conformité.
              </>
            )}
          </div>
        </div>
      )}

      <FilterBar active={f.active} onReset={f.reset} onRefresh={reload} refreshing={loading}>
        <FilterText label="Type d’entité" placeholder="ex. User" value={entityType} onChange={(v) => f.set('entityType', v)} />
        <FilterText label="Action" placeholder="ex. USER_BLOCKED" value={action} onChange={(v) => f.set('action', v)} />
        <FilterText label="Du" type="date" value={from} onChange={(v) => f.set('from', v)} debounce={0} max={to || undefined} />
        <FilterText label="Au" type="date" value={to} onChange={(v) => f.set('to', v)} debounce={0} min={from || undefined} />
      </FilterBar>

      <div className="card card-table">
        <DataTable<AuditEntry>
          caption="Journal d’audit"
          loading={loading}
          rows={data?.items}
          rowKey={(e) => e.id}
          total={data?.total}
          pagination={{ page: data?.page || page, pageSize: data?.pageSize || PAGE_SIZE, onChange: f.setPage }}
          empty={{ kind: 'documents', title: f.active ? 'Aucune entrée pour ces filtres' : 'Le journal est vide', hint: f.active ? 'Élargissez la période ou réinitialisez les filtres.' : 'Chaque action sensible réalisée dans le back-office sera consignée ici.' }}
          columns={[
            { key: 'seq', header: 'Séq.', align: 'right', numeric: true, render: (e) => <span className="mono">{String(e.seq)}</span> },
            { key: 'date', header: 'Date', nowrap: true, render: (e) => <DateTime value={e.createdAt} /> },
            {
              key: 'actor',
              header: 'Acteur',
              render: (e) =>
                e.actor ? (
                  <>
                    <strong>{e.actor.fullName}</strong>
                    <span className="cell-sub">
                      {e.actor.email}
                      {e.actorRole ? ` · ${label('role', e.actorRole)}` : ''}
                    </span>
                  </>
                ) : (
                  <span className="muted">{label('actorType', e.actorType)}</span>
                ),
            },
            { key: 'actorType', header: 'Type d’acteur', priority: 'detail', render: (e) => label('actorType', e.actorType) },
            { key: 'action', header: 'Action', render: (e) => <strong className="mono">{e.action}</strong> },
            {
              key: 'entity',
              header: 'Entité',
              priority: 'secondary',
              render: (e) => (
                <>
                  {e.entityType} <Copyable value={e.entityId} what="l’identifiant de l’entité" />
                </>
              ),
            },
            { key: 'hash', header: 'Empreinte', priority: 'detail', render: (e) => <Copyable value={e.hash} short={12} what="l’empreinte" className="hash" /> },
          ]}
        />
      </div>
    </div>
  );
}
