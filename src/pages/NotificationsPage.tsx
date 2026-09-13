import { api } from '../api';
import type { NotificationLogEntry, NotificationStatus } from '../api/types';
import Badge from '../components/Badge';
import Copyable from '../components/Copyable';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import FilterBar, { FilterSelect } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import PageHeader from '../components/PageHeader';
import { formatNumber } from '../format';
import { useLoad } from '../hooks';
import { options } from '../labels';

const STATUSES: NotificationStatus[] = ['QUEUED', 'SENT', 'FAILED'];

export default function NotificationsPage() {
  const f = useFilters({ status: '' });
  const { status } = f.values;
  const { data, loading, reload } = useLoad(() => api.notifications.log({ status }), [status]);

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Vérifiez que les SMS, e-mails et notifications push destinés aux clients ont bien été délivrés, et identifiez les échecs fournisseur." breadcrumb={[{ label: 'Opérations' }, { label: 'Notifications' }]} />

      <FilterBar active={f.active} onReset={f.reset} onRefresh={reload} refreshing={loading}>
        <FilterSelect label="Statut" value={status} onChange={(v) => f.set('status', v)} allLabel="Tous les statuts" options={options('notification', STATUSES)} />
      </FilterBar>

      <div className="card card-table">
        <DataTable<NotificationLogEntry>
          caption="Journal des notifications"
          loading={loading}
          rows={data}
          rowKey={(n) => n.id}
          minWidth={900}
          empty={{
            kind: 'bell',
            title: status === 'FAILED' ? 'Aucune notification en échec' : f.active ? 'Aucune notification dans ce statut' : 'Aucune notification envoyée',
            hint: status === 'FAILED' ? 'Tous les envois récents ont été délivrés par les fournisseurs.' : 'Les envois déclenchés par les événements clients apparaîtront ici.',
          }}
          columns={[
            { key: 'date', header: 'Créée le', nowrap: true, render: (n) => <DateTime value={n.createdAt} /> },
            { key: 'channel', header: 'Canal', render: (n) => <Badge kind="notificationChannel" value={n.channel} /> },
            { key: 'recipient', header: 'Destinataire', render: (n) => n.recipient },
            { key: 'template', header: 'Modèle', priority: 'secondary', render: (n) => <span className="mono">{n.template}</span> },
            { key: 'event', header: 'Événement', priority: 'detail', render: (n) => n.eventName ?? <span className="muted">—</span> },
            { key: 'status', header: 'Statut', render: (n) => <Badge kind="notification" value={n.status} /> },
            { key: 'attempts', header: 'Tentatives', align: 'right', numeric: true, priority: 'secondary', render: (n) => formatNumber(n.attempts) },
            { key: 'provider', header: 'Réf. fournisseur', priority: 'detail', render: (n) => <Copyable value={n.providerRef} short={12} what="la référence fournisseur" /> },
            { key: 'sent', header: 'Envoyée le', priority: 'detail', nowrap: true, render: (n) => <DateTime value={n.sentAt} /> },
            {
              key: 'error',
              header: 'Erreur',
              render: (n) =>
                n.error ? (
                  <span className="text-danger small" title={n.error}>
                    {n.error.length > 60 ? `${n.error.slice(0, 60)}…` : n.error}
                  </span>
                ) : (
                  <span className="muted">—</span>
                ),
            },
          ]}
        />
      </div>
    </div>
  );
}
