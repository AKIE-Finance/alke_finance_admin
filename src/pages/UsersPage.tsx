import { Link } from 'react-router-dom';
import { api } from '../api';
import type { UserRow } from '../api/types';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import FilterBar, { FilterSelect, FilterText } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import PageHeader from '../components/PageHeader';
import { useLoad } from '../hooks';
import { label, options } from '../labels';

const KYC_OPTIONS = ['NOT_STARTED', 'DRAFT', 'SUBMITTED', 'AUTO_APPROVED', 'MANUAL_REVIEW', 'VALIDATED', 'REJECTED', 'RE_KYC'];
const PAGE_SIZE = 25;

export default function UsersPage() {
  const f = useFilters({ search: '', kycStatus: '' });
  const { search, kycStatus } = f.values;
  const page = f.page;

  const { data, loading, reload } = useLoad(() => api.users.list({ search, kycStatus, page, pageSize: PAGE_SIZE }), [search, kycStatus, page]);

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle="Retrouvez un client, vérifiez son statut KYC et l’état de son compte avant d’intervenir." breadcrumb={[{ label: 'Clients' }, { label: 'Utilisateurs' }]} />

      <FilterBar active={f.active} onReset={f.reset} onRefresh={reload} refreshing={loading}>
        <FilterText label="Recherche" placeholder="Nom, e-mail ou téléphone" value={search} onChange={(v) => f.set('search', v)} wide type="search" autoComplete="off" />
        <FilterSelect label="Statut KYC" value={kycStatus} onChange={(v) => f.set('kycStatus', v)} allLabel="Tous les statuts" options={options('kyc', KYC_OPTIONS)} />
      </FilterBar>

      <div className="card card-table">
        <DataTable<UserRow>
          caption="Liste des utilisateurs"
          loading={loading}
          rows={data?.items}
          rowKey={(u) => u.id}
          total={data?.total}
          pagination={{ page: data?.page || page, pageSize: data?.pageSize || PAGE_SIZE, onChange: f.setPage }}
          empty={{
            kind: 'users',
            title: f.active ? 'Aucun client ne correspond à ces critères' : 'Aucun client inscrit',
            hint: f.active ? 'Élargissez la recherche ou réinitialisez les filtres.' : 'Les clients apparaîtront ici dès leur inscription dans l’application.',
          }}
          columns={[
            {
              key: 'name',
              header: 'Client',
              render: (u) => (
                <>
                  <Link to={`/users/${u.id}`} className="strong">
                    {u.fullName}
                  </Link>
                  <span className="cell-sub">{u.email}</span>
                </>
              ),
            },
            { key: 'phone', header: 'Téléphone', priority: 'detail', nowrap: true, render: (u) => u.phone || <span className="muted">—</span> },
            { key: 'country', header: 'Pays', priority: 'secondary', render: (u) => <span title={u.country}>{label('country', u.country)}</span> },
            { key: 'kyc', header: 'KYC', render: (u) => <Badge kind="kyc" value={u.kycStatus} /> },
            { key: 'role', header: 'Rôle', priority: 'detail', render: (u) => label('role', u.role) },
            { key: 'state', header: 'Compte', render: (u) => <Badge kind="account" value={u.isBlocked ? 'BLOCKED' : 'ACTIVE'} /> },
            { key: 'created', header: 'Inscrit le', priority: 'secondary', nowrap: true, render: (u) => <DateTime value={u.createdAt} dateOnly /> },
            {
              key: 'actions',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              render: (u) => (
                <Link className="btn btn-sm btn-outline" to={`/users/${u.id}`}>
                  Voir
                </Link>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
