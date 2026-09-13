import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Market, MirrorRow } from '../api/types';
import { useAuth } from '../auth';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import Icon, { type IconName } from '../components/icons';
import Money from '../components/Money';
import PageHeader from '../components/PageHeader';
import { formatMoney, formatNumber } from '../format';
import { useLoad } from '../hooks';

function Tile({ label, value, sub, to, tone }: { label: string; value: string | number; sub?: string; to?: string; tone?: 'warn' | 'danger' | 'ok' }) {
  const body = (
    <div className={`card stat-card ${tone ? `stat-${tone}` : ''}`.trim()}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
  return to ? (
    <Link to={to} className="tile-link">
      {body}
    </Link>
  ) : (
    body
  );
}

interface Todo {
  icon: IconName;
  label: string;
  sub: string;
  to: string;
  count: number | undefined;
  hot?: 'warn' | 'danger';
}

function TodoRow({ t }: { t: Todo }) {
  const n = t.count;
  const zero = n === 0;
  const toneClass = zero || n === undefined ? '' : t.hot === 'danger' ? 'is-danger' : 'is-hot';
  return (
    <li>
      <Link to={t.to}>
        <span className={`todo-icon ${toneClass}`.trim()}>
          <Icon name={t.icon} size={16} />
        </span>
        <span className="todo-text">
          <span className="todo-label">{t.label}</span>
          <br />
          <span className="todo-sub">{t.sub}</span>
        </span>
        <span className={`todo-count ${zero ? 'is-zero' : ''}`.trim()} aria-label={n === undefined ? 'chargement' : `${n} élément${n > 1 ? 's' : ''}`}>
          {n === undefined ? '…' : formatNumber(n)}
        </span>
      </Link>
    </li>
  );
}

const sum = (rec: Record<string, number> | undefined) => Object.values(rec ?? {}).reduce((a, b) => a + b, 0);

export default function OverviewPage() {
  const { can } = useAuth();
  const stats = useLoad(() => api.stats.get(), []);
  const markets = useLoad(() => api.markets.list(), []);
  const showFinance = can('reconciliation.view');
  const showNotif = can('notifications.view');
  const metrics = useLoad(() => (showFinance ? api.reconciliation.metrics() : Promise.resolve(undefined)), [showFinance]);
  const mirror = useLoad(() => (showFinance ? api.reconciliation.mirror() : Promise.resolve([] as MirrorRow[])), [showFinance]);
  const failedNotifs = useLoad(() => (showNotif ? api.notifications.log({ status: 'FAILED' }) : Promise.resolve(undefined)), [showNotif]);

  const s = stats.data;
  const m = metrics.data;
  const usersTotal = sum(s?.users.byKycStatus);
  const ordersTotal = sum(s?.orders.byStatus);
  const marketById = new Map<string, Market>((markets.data ?? []).map((mk) => [mk.code, mk]));

  const todos: Todo[] = [
    ...(can('approvals.view')
      ? [{ icon: 'approvals' as IconName, label: 'Approbations en attente', sub: 'Demandes à valider par un second opérateur', to: '/approvals', count: s?.pendingApprovals, hot: 'warn' as const }]
      : []),
    ...(can('kyc.view') ? [{ icon: 'kyc' as IconName, label: 'Dossiers KYC en revue', sub: 'Vérifications d’identité à traiter manuellement', to: '/kyc', count: s?.kycQueue, hot: 'warn' as const }] : []),
    ...(can('compliance.view')
      ? [{ icon: 'compliance' as IconName, label: 'Alertes de conformité ouvertes', sub: 'Surveillance LCB-FT à qualifier', to: '/compliance', count: s?.openComplianceAlerts, hot: 'danger' as const }]
      : []),
    ...(showFinance
      ? [{ icon: 'reconciliation' as IconName, label: 'Écarts de rapprochement ouverts', sub: 'Différences entre grand livre et relevés', to: '/reconciliation', count: s?.openReconciliationItems, hot: 'warn' as const }]
      : []),
    ...(showNotif
      ? [{ icon: 'notifications' as IconName, label: 'Notifications en échec', sub: 'Envois SMS / e-mail non délivrés', to: '/notifications?status=FAILED', count: failedNotifs.data?.length, hot: 'danger' as const }]
      : []),
  ];

  return (
    <div>
      <PageHeader title="Vue d’ensemble" subtitle="Ce qui attend une action aujourd’hui, l’état des marchés et les principaux indicateurs de la plateforme." breadcrumb={[{ label: 'Pilotage' }, { label: 'Vue d’ensemble' }]} />

      {stats.loading && !s && (
        <div className="grid grid-4" aria-busy="true" aria-label="Chargement des indicateurs">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card stat-card">
              <span className="skeleton" style={{ width: '50%' }} />
              <span className="skeleton" style={{ width: '30%', height: 24 }} />
            </div>
          ))}
        </div>
      )}

      {s && (
        <>
          <div className="grid grid-4">
            <Tile label="Approbations en attente" value={s.pendingApprovals} sub="Validation à deux yeux" to="/approvals" tone={s.pendingApprovals > 0 ? 'warn' : 'ok'} />
            <Tile label="File KYC" value={s.kycQueue} sub="Dossiers en revue manuelle" to="/kyc" tone={s.kycQueue > 0 ? 'warn' : undefined} />
            <Tile label="Alertes conformité" value={s.openComplianceAlerts} sub="Ouvertes" to="/compliance" tone={s.openComplianceAlerts > 0 ? 'danger' : 'ok'} />
            <Tile label="Écarts de rapprochement" value={s.openReconciliationItems} sub="Ouverts" to="/reconciliation" tone={s.openReconciliationItems > 0 ? 'warn' : 'ok'} />
          </div>

          <div className="grid grid-2-1 mt-4">
            <section className="card" aria-labelledby="todo-title">
              <h2 id="todo-title" className="section-title mb-2">
                À traiter
              </h2>
              <ul className="todo-list">
                {todos.map((t) => (
                  <TodoRow key={t.to} t={t} />
                ))}
              </ul>
            </section>

            <div className="stack stack-4">
              <section className="card" aria-labelledby="users-title">
                <div className="stat-label" id="users-title">
                  Clients par statut KYC
                </div>
                <div className="stat-value">{formatNumber(usersTotal)}</div>
                <ul className="kv-list mt-2">
                  {Object.entries(s.users.byKycStatus).map(([k, v]) => (
                    <li key={k}>
                      <Badge kind="kyc" value={k} /> <span>{formatNumber(v)}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="card" aria-labelledby="orders-title">
                <div className="stat-label" id="orders-title">
                  Ordres par statut
                </div>
                <div className="stat-value">{formatNumber(ordersTotal)}</div>
                <ul className="kv-list mt-2">
                  {Object.entries(s.orders.byStatus).map(([k, v]) => (
                    <li key={k}>
                      <Badge kind="order" value={k} /> <span>{formatNumber(v)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <section className="section" aria-labelledby="markets-title">
            <div className="section-head">
              <h2 id="markets-title" className="section-title">
                Marchés
              </h2>
              {can('catalog.view') && <Link to="/catalog">Catalogue</Link>}
            </div>
            <div className="market-row">
              {s.markets.map((mk) => {
                const full = marketById.get(mk.code);
                return (
                  <div key={mk.code} className="market-chip">
                    <div>
                      <div className="market-code">{mk.code}</div>
                      <div className="market-meta">
                        {full ? `Cut-off ${full.cutoffTime}${full.timezone ? ` (${full.timezone})` : ''} · J+${full.settlementDays}` : 'Cut-off —'}
                      </div>
                    </div>
                    <Badge kind="liveTrading" value={mk.liveTrading ? 'LIVE' : 'SIMULATED'} />
                  </div>
                );
              })}
              {s.markets.length === 0 && <p className="muted small">Aucun marché configuré.</p>}
            </div>
          </section>

          <section className="section" aria-labelledby="deposits-title">
            <div className="section-head">
              <h2 id="deposits-title" className="section-title">
                Dépôts encaissés
              </h2>
            </div>
            <div className="card">
              {Object.entries(s.deposits.paidByCurrency).length === 0 ? (
                <p className="muted small">Aucun dépôt encaissé à ce jour.</p>
              ) : (
                <ul className="kv-list">
                  {Object.entries(s.deposits.paidByCurrency).map(([cur, v]) => (
                    <li key={cur}>
                      <span>{cur}</span> <strong className="num">{formatMoney(v, cur)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      {showFinance && (
        <>
          <section className="section" aria-labelledby="fin-title">
            <div className="section-head">
              <h2 id="fin-title" className="section-title">
                Indicateurs financiers
              </h2>
            </div>
            <div className="grid grid-4">
              <Tile label="Écart miroir (XAF)" value={m ? formatMoney(m.mirrorMismatchXaf, 'XAF') : '…'} sub="Grand livre vs relevé SDB" tone={m && Number(m.mirrorMismatchXaf) !== 0 ? 'danger' : 'ok'} />
              <Tile label="Écarts ouverts" value={m ? m.openReconciliationItems : '…'} to="/reconciliation" />
              <Tile
                label="Retrait en attente le plus ancien"
                value={m ? (m.oldestPendingWithdrawalHours === null ? '—' : `${formatNumber(m.oldestPendingWithdrawalHours)} h`) : '…'}
                tone={m && (m.oldestPendingWithdrawalHours ?? 0) > 48 ? 'warn' : undefined}
              />
              <Tile label="Latence du dernier ACK" value={m ? (m.ackLatencyMinutesLast === null ? '—' : `${formatNumber(m.ackLatencyMinutesLast)} min`) : '…'} />
            </div>
          </section>

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
        </>
      )}
    </div>
  );
}
