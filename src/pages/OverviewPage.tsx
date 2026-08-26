import { useEffect, useState } from 'react';
import { api } from '../api';
import Badge from '../components/Badge';

interface Stats {
  users: { total: number; verified: number; pendingKyc: number; kycConversionRate: number };
  orders: { total: number; simulated: number; transmitted: number; executed: number };
  support: { openTickets: number };
  markets: { status: string; _count: number }[];
  partnersPipeline: { agreementStatus: string; _count: number }[];
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Stats>('/admin/stats')
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-text">{error}</div>;
  if (!stats) return <div className="empty-state">Chargement…</div>;

  return (
    <div>
      <h1 className="page-title">Vue d’ensemble</h1>
      <p className="page-subtitle">Pilotage global de la plateforme AlKÉ Finance.</p>

      <div className="grid grid-4">
        <div className="card stat-card">
          <span className="stat-label">Utilisateurs</span>
          <span className="stat-value">{stats.users.total}</span>
          <span className="stat-sub">{stats.users.verified} KYC validés · {stats.users.pendingKyc} en attente</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Taux de conversion KYC</span>
          <span className="stat-value">{stats.users.kycConversionRate}%</span>
          <span className="stat-sub">Utilisateurs vérifiés / total</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Ordres</span>
          <span className="stat-value">{stats.orders.total}</span>
          <span className="stat-sub">{stats.orders.executed} exécutés · {stats.orders.transmitted} transmis · {stats.orders.simulated} simulés</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Tickets support ouverts</span>
          <span className="stat-value">{stats.support.openTickets}</span>
        </div>
      </div>

      <div className="section-title">Statut des marchés</div>
      <div className="grid grid-3">
        {stats.markets.map((m) => (
          <div className="card" key={m.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge value={m.status} />
            <span style={{ fontWeight: 700 }}>{m._count} marché(s)</span>
          </div>
        ))}
      </div>

      <div className="section-title">Pipeline partenaires boursiers (SDB/SGI)</div>
      <div className="grid grid-4">
        {stats.partnersPipeline.map((p) => (
          <div className="card" key={p.agreementStatus} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge value={p.agreementStatus} />
            <span style={{ fontWeight: 700 }}>{p._count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
