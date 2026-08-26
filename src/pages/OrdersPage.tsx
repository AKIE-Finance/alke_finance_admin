import { useEffect, useState } from 'react';
import { api, BASE_URL } from '../api';
import Badge from '../components/Badge';

interface OrderRow {
  id: string;
  side: string;
  quantity: string;
  estimatedPrice: string;
  estimatedTotal: string;
  status: string;
  executionTier: string;
  marketId: string;
  partnerReference: string | null;
  instrument: { symbol: string; currency: string };
  market: { code: string };
  partner: { name: string } | null;
  user: { fullName: string; email: string };
  submittedAt: string;
}

interface Market { id: string; code: string; }

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [reviewing, setReviewing] = useState<OrderRow | null>(null);
  const [reviewForm, setReviewForm] = useState({ status: 'EXECUTED', executedPrice: '', partnerReference: '', rejectionReason: '' });
  const [busy, setBusy] = useState(false);

  const load = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (marketFilter) params.set('marketId', marketFilter);
    api.get<OrderRow[]>(`/orders?${params.toString()}`).then(setOrders);
  };

  useEffect(() => { api.get<Market[]>('/markets').then(setMarkets); }, []);
  useEffect(load, [statusFilter, marketFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openReview = (o: OrderRow) => {
    setReviewing(o);
    setReviewForm({ status: 'EXECUTED', executedPrice: o.estimatedPrice, partnerReference: '', rejectionReason: '' });
  };

  const submitReview = async () => {
    if (!reviewing) return;
    setBusy(true);
    try {
      await api.patch(`/orders/${reviewing.id}/review`, {
        status: reviewForm.status,
        executedPrice: reviewForm.status !== 'REJECTED' ? Number(reviewForm.executedPrice) : undefined,
        partnerReference: reviewForm.partnerReference || undefined,
        rejectionReason: reviewForm.status === 'REJECTED' ? reviewForm.rejectionReason : undefined,
      });
      setReviewing(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Ordres</h1>
      <p className="page-subtitle">
        Module 9.3 — vue globale des ordres et rapprochement avec les confirmations d’exécution des
        partenaires SDB/SGI.
      </p>

      <div className="toolbar">
        <select style={{ maxWidth: 220 }} value={marketFilter} onChange={(e) => setMarketFilter(e.target.value)}>
          <option value="">Tous les marchés</option>
          {markets.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
        </select>
        <select style={{ maxWidth: 220 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          {['PENDING', 'TRANSMITTED', 'PARTIALLY_EXECUTED', 'EXECUTED', 'REJECTED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {marketFilter && (
          <a className="btn btn-outline btn-sm" href={`${BASE_URL}/markets/${marketFilter}/orders/export`} target="_blank" rel="noreferrer">
            Exporter le fichier (Palier 1)
          </a>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Client</th><th>Marché</th><th>Valeur</th><th>Sens</th><th>Qté</th><th>Montant est.</th>
              <th>Partenaire</th><th>Palier</th><th>Statut</th><th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.user.fullName}</td>
                <td>{o.market.code}</td>
                <td>{o.instrument.symbol}</td>
                <td>{o.side}</td>
                <td>{o.quantity}</td>
                <td>{o.estimatedTotal} {o.instrument.currency}</td>
                <td>{o.partner?.name ?? '—'}</td>
                <td style={{ fontSize: 11 }}>{o.executionTier.replace('TIER', 'T')}</td>
                <td><Badge value={o.status} /></td>
                <td>
                  {(o.status === 'TRANSMITTED' || o.status === 'PENDING') && (
                    <button className="btn btn-sm btn-outline" onClick={() => openReview(o)}>Traiter</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reviewing && (
        <div className="modal-backdrop" onClick={() => setReviewing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Rapprochement — {reviewing.instrument.symbol}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {reviewing.user.fullName} · {reviewing.side} {reviewing.quantity} · via {reviewing.partner?.name ?? 'mode simulé'}
            </p>
            <div className="form-row">
              <label>Résultat</label>
              <select value={reviewForm.status} onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}>
                <option value="EXECUTED">Exécuté</option>
                <option value="PARTIALLY_EXECUTED">Partiellement exécuté</option>
                <option value="REJECTED">Rejeté</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>
            {reviewForm.status !== 'REJECTED' && reviewForm.status !== 'CANCELLED' ? (
              <>
                <div className="form-row">
                  <label>Prix d’exécution confirmé</label>
                  <input type="number" step="0.01" value={reviewForm.executedPrice} onChange={(e) => setReviewForm({ ...reviewForm, executedPrice: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Référence partenaire</label>
                  <input value={reviewForm.partnerReference} onChange={(e) => setReviewForm({ ...reviewForm, partnerReference: e.target.value })} placeholder="Ex. n° de confirmation SDB/SGI" />
                </div>
              </>
            ) : (
              <div className="form-row">
                <label>Motif</label>
                <input value={reviewForm.rejectionReason} onChange={(e) => setReviewForm({ ...reviewForm, rejectionReason: e.target.value })} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn-primary" disabled={busy} onClick={submitReview}>Confirmer</button>
              <button className="btn btn-outline" onClick={() => setReviewing(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
