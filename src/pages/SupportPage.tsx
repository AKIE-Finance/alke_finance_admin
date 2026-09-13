import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { SupportTicket, TicketStatus } from '../api/types';
import { useAuth } from '../auth';
import Badge from '../components/Badge';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import EmptyState from '../components/EmptyState';
import { TextAreaField } from '../components/Field';
import FilterBar, { FilterSelect } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import PageHeader from '../components/PageHeader';
import { useBusy, useLoad } from '../hooks';
import { label, options } from '../labels';
import { toast } from '../toast';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function SupportPage() {
  const { can } = useAuth();
  const manage = can('support.manage');
  const f = useFilters({ status: '' });
  const { status } = f.values;
  const { data, loading, reload } = useLoad(() => api.support.tickets({ status }), [status]);
  const { busy, run } = useBusy();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const tickets = data ?? [];
  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const send = async () => {
    if (!selected || !reply.trim()) return;
    const res = await run(async () => {
      await api.support.addMessage(selected.id, reply.trim());
      // Seul un ticket encore OPEN passe en cours : on ne rétrograde jamais un ticket résolu/clos.
      if (selected.status === 'OPEN') await api.support.setStatus(selected.id, 'IN_PROGRESS');
      return true;
    }, 'Réponse envoyée.');
    if (res === undefined) return;
    setReply('');
    reload();
  };

  const resolve = async () => {
    if (!selected) return;
    if (selected.status === 'RESOLVED' || selected.status === 'CLOSED') {
      toast.info('Ce ticket est déjà résolu.');
      return;
    }
    const res = await run(() => api.support.setStatus(selected.id, 'RESOLVED'), 'Ticket marqué résolu.');
    if (res === undefined) return;
    reload();
  };

  return (
    <div>
      <PageHeader title="Support client" subtitle="Répondez aux demandes et réclamations des clients, suivez leur avancement et clôturez-les une fois traitées." breadcrumb={[{ label: 'Opérations' }, { label: 'Support' }]} />

      <FilterBar active={f.active} onReset={f.reset} onRefresh={reload} refreshing={loading}>
        <FilterSelect label="Statut" value={status} onChange={(v) => f.set('status', v)} allLabel="Tous les statuts" options={options('ticket', STATUSES)} />
      </FilterBar>

      <div className="split">
        <div className="card card-table">
          <DataTable<SupportTicket>
            caption="Tickets"
            loading={loading}
            rows={tickets}
            rowKey={(t) => t.id}
            minWidth={0}
            empty={{ kind: 'inbox', title: f.active ? 'Aucun ticket dans ce statut' : 'Aucun ticket', hint: 'Les demandes envoyées par les clients depuis l’application apparaîtront ici.' }}
            onRowClick={(t) => {
              setSelectedId(t.id);
              setReply('');
            }}
            columns={[
              {
                key: 'subject',
                header: 'Sujet',
                render: (t) => (
                  <>
                    <strong>{t.subject}</strong>
                    <span className="cell-sub">
                      {t.category} · priorité {label('ticketPriority', t.priority).toLowerCase()}
                    </span>
                  </>
                ),
              },
              { key: 'user', header: 'Client', priority: 'secondary', render: (t) => t.user?.fullName },
              { key: 'status', header: 'Statut', render: (t) => <Badge kind="ticket" value={t.status} /> },
              { key: 'created', header: 'Créé le', priority: 'detail', nowrap: true, render: (t) => <DateTime value={t.createdAt} /> },
            ]}
          />
        </div>

        <div className="card">
          {!selected ? (
            <EmptyState kind="inbox" title="Sélectionnez un ticket" hint="Le fil de discussion et la zone de réponse s’afficheront ici." compact />
          ) : (
            <div>
              <div className="row-between">
                <div>
                  <strong>{selected.subject}</strong>
                  <div className="muted small">
                    {selected.user?.fullName} · {selected.user?.email} · {selected.category} · priorité {label('ticketPriority', selected.priority).toLowerCase()}
                  </div>
                </div>
                <Badge kind="ticket" value={selected.status} />
              </div>

              <div className="thread" aria-label="Fil de discussion" role="log">
                {selected.messages.length === 0 && <div className="muted small">Aucun message.</div>}
                {selected.messages.map((m) => (
                  <div key={m.id} className={`bubble ${m.authorType === 'AGENT' ? 'bubble-agent' : ''}`.trim()}>
                    <div className="pre-wrap">{m.body}</div>
                    <time dateTime={m.createdAt}>
                      {label('authorType', m.authorType)} · <DateTime value={m.createdAt} />
                    </time>
                  </div>
                ))}
              </div>

              {manage ? (
                <>
                  <TextAreaField label="Réponse au client" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Votre réponse…" hint="Envoyée au client dans l’application ; le ticket passe « En cours » s’il était ouvert." />
                  <div className="actions mt-3">
                    <Button variant="primary" busy={busy} disabled={!reply.trim()} onClick={() => void send()}>
                      Envoyer
                    </Button>
                    {selected.status !== 'RESOLVED' && selected.status !== 'CLOSED' && (
                      <Button disabled={busy} onClick={() => void resolve()}>
                        Marquer résolu
                      </Button>
                    )}
                    {can('users.view') && selected.user && (
                      <Link className="btn btn-outline" to={`/users?search=${encodeURIComponent(selected.user.email)}`}>
                        Fiche client
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <p className="muted small">Lecture seule pour votre rôle.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
