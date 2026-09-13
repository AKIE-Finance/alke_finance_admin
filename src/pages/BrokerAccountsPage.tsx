import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { BrokerAccount, BrokerAccountState } from '../api/types';
import { useAuth } from '../auth';
import Badge from '../components/Badge';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import { SelectField, TextField } from '../components/Field';
import FilterBar, { FilterSelect } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { useBusy, useLoad } from '../hooks';
import { options } from '../labels';

const STATES: BrokerAccountState[] = ['REQUESTED', 'OPEN', 'SUSPENDED', 'CLOSED'];
const EDITABLE_STATES: BrokerAccountState[] = ['OPEN', 'SUSPENDED'];

export default function BrokerAccountsPage() {
  const { can } = useAuth();
  const manage = can('brokerAccounts.manage');
  const f = useFilters({ state: 'REQUESTED' });
  const { state } = f.values;
  const { data, loading, reload } = useLoad(() => api.brokerAccounts.list({ state }), [state]);
  const [editing, setEditing] = useState<BrokerAccount | null>(null);
  const [form, setForm] = useState({ externalAccountNo: '', state: 'OPEN' as BrokerAccountState });
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useBusy();
  const exporting = useBusy();

  const openEditor = (a: BrokerAccount) => {
    setEditing(a);
    setError(null);
    setForm({ externalAccountNo: a.externalAccountNo ?? '', state: a.state === 'SUSPENDED' ? 'SUSPENDED' : 'OPEN' });
  };

  const save = async () => {
    if (!editing) return;
    if (!form.externalAccountNo.trim()) {
      setError('Le numéro de compte attribué par la SDB est obligatoire.');
      return;
    }
    const res = await run(() => api.brokerAccounts.update(editing.id, { externalAccountNo: form.externalAccountNo.trim(), state: form.state }), 'Compte-titres mis à jour.');
    if (res !== undefined) {
      setEditing(null);
      reload();
    }
  };

  return (
    <div>
      <PageHeader
        title="Comptes-titres"
        subtitle="Transmettez les demandes d’ouverture à la société de bourse et enregistrez le numéro de compte qu’elle attribue à chaque client."
        breadcrumb={[{ label: 'Clients' }, { label: 'Comptes-titres' }]}
        actions={
          manage ? (
            <Button variant="primary" busy={exporting.busy} onClick={() => void exporting.run(() => api.brokerAccounts.exportCsv(), 'Export CSV téléchargé.')}>
              Exporter les demandes (CSV)
            </Button>
          ) : undefined
        }
      />

      <FilterBar active={f.active} onReset={f.reset} onRefresh={reload} refreshing={loading}>
        <FilterSelect label="État" value={state} onChange={(v) => f.set('state', v)} allLabel="Tous les états" options={options('brokerAccount', STATES)} />
      </FilterBar>

      <div className="card card-table">
        <DataTable<BrokerAccount>
          caption="Comptes-titres"
          loading={loading}
          rows={data}
          rowKey={(a) => a.id}
          empty={{
            kind: 'documents',
            title: state === 'REQUESTED' ? 'Aucune demande en attente' : 'Aucun compte-titres dans cet état',
            hint: state === 'REQUESTED' ? 'Les demandes d’ouverture apparaissent ici dès qu’un client validé en KYC en fait la demande.' : 'Changez l’état filtré pour consulter d’autres comptes.',
          }}
          columns={[
            {
              key: 'user',
              header: 'Client',
              render: (a) => (
                <>
                  <strong>{a.user?.fullName ?? a.userId}</strong>
                  {a.user?.email && <span className="cell-sub">{a.user.email}</span>}
                </>
              ),
            },
            { key: 'partner', header: 'Partenaire', priority: 'secondary', render: (a) => a.partner?.name ?? a.partnerId },
            { key: 'no', header: 'N° de compte', render: (a) => (a.externalAccountNo ? <span className="mono">{a.externalAccountNo}</span> : <span className="muted">non attribué</span>) },
            { key: 'state', header: 'État', render: (a) => <Badge kind="brokerAccount" value={a.state} /> },
            { key: 'requested', header: 'Demandé le', priority: 'secondary', nowrap: true, render: (a) => <DateTime value={a.requestedAt} /> },
            { key: 'opened', header: 'Ouvert le', priority: 'detail', nowrap: true, render: (a) => <DateTime value={a.openedAt} /> },
            {
              key: 'actions',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              render: (a) => (
                <div className="actions-inline">
                  {a.userId && (
                    <Link className="btn btn-sm btn-outline" to={`/users/${a.userId}`}>
                      Client
                    </Link>
                  )}
                  {manage && (
                    <Button size="sm" variant="primary" onClick={() => openEditor(a)}>
                      {a.externalAccountNo ? 'Modifier' : 'Attribuer un n°'}
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {editing && (
        <Modal
          title={`Compte-titres — ${editing.user?.fullName ?? 'client'}`}
          description={`Partenaire : ${editing.partner?.name ?? editing.partnerId}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button onClick={() => setEditing(null)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="primary" busy={busy} onClick={() => void save()}>
                Enregistrer
              </Button>
            </>
          }
        >
          <TextField
            label="Numéro de compte-titres attribué par la SDB"
            value={form.externalAccountNo}
            onChange={(e) => {
              setForm({ ...form, externalAccountNo: e.target.value });
              setError(null);
            }}
            error={error}
            required
            autoFocus
          />
          <SelectField label="État" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value as BrokerAccountState })} hint="Un compte ouvert permet au client de passer des ordres.">
            {options('brokerAccount', EDITABLE_STATES).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </Modal>
      )}
    </div>
  );
}
