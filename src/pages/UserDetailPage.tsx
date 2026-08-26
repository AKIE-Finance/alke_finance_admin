import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Badge from '../components/Badge';

interface KycSubmission {
  id: string;
  status: string;
  documentType: string;
  documentFrontUrl: string;
  selfieUrl: string;
  submittedAt: string;
  rejectionReason: string | null;
}

interface UserDetail {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  kycStatus: string;
  isBlocked: boolean;
  blockedReason: string | null;
  createdAt: string;
  kycSubmissions: KycSubmission[];
  accounts: { currency: string; balance: string }[];
  positions: { quantity: string; instrument: { symbol: string; name: string } }[];
  orders: { id: string; side: string; quantity: string; status: string; instrument: { symbol: string } }[];
}

export default function UserDetailPage() {
  const { id } = useParams();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');

  const load = () => {
    if (!id) return;
    api.get<UserDetail>(`/admin/users/${id}`).then(setUser);
  };

  useEffect(load, [id]);

  const reviewKyc = async (submissionId: string, status: 'VERIFIED' | 'REJECTED') => {
    setBusy(true);
    try {
      await api.post(`/kyc/submissions/${submissionId}/review`, {
        status,
        rejectionReason: status === 'REJECTED' ? reason || 'Documents illisibles ou incomplets.' : undefined,
      });
      load();
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await api.patch(`/admin/users/${user.id}/block`, {
        isBlocked: !user.isBlocked,
        blockedReason: !user.isBlocked ? 'Blocage manuel back-office' : undefined,
      });
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!user) return <div className="empty-state">Chargement…</div>;

  const latestKyc = user.kycSubmissions[0];

  return (
    <div>
      <Link to="/users" style={{ color: 'var(--alke-blue)', fontSize: 13, fontWeight: 600 }}>← Retour aux utilisateurs</Link>
      <h1 className="page-title" style={{ marginTop: 10 }}>{user.fullName}</h1>
      <p className="page-subtitle">{user.email} · {user.phone} · {user.country}</p>

      <div className="grid grid-3">
        <div className="card">
          <div className="stat-label">Statut KYC</div>
          <div style={{ marginTop: 8 }}><Badge value={user.kycStatus} /></div>
        </div>
        <div className="card">
          <div className="stat-label">Compte</div>
          <div style={{ marginTop: 8 }}>
            {user.isBlocked ? <Badge value="REJECTED" /> : <Badge value="ACTIVE" />}
            <button className="btn btn-sm btn-outline" style={{ marginLeft: 10 }} onClick={toggleBlock} disabled={busy}>
              {user.isBlocked ? 'Débloquer' : 'Bloquer'}
            </button>
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Soldes</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>
            {user.accounts.length === 0 ? '—' : user.accounts.map((a) => (
              <div key={a.currency}>{a.balance} {a.currency}</div>
            ))}
          </div>
        </div>
      </div>

      {latestKyc && latestKyc.status !== 'VERIFIED' && (
        <>
          <div className="section-title">Dossier KYC à traiter</div>
          <div className="card">
            <div className="grid grid-2">
              <div>
                <div className="stat-label">Pièce d’identité</div>
                <a href={latestKyc.documentFrontUrl} target="_blank" rel="noreferrer">Voir le document</a>
              </div>
              <div>
                <div className="stat-label">Selfie de vérification</div>
                <a href={latestKyc.selfieUrl} target="_blank" rel="noreferrer">Voir le selfie</a>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: 16 }}>
              <label>Motif de rejet (si rejeté)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. photo illisible, document expiré..." />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-green" disabled={busy} onClick={() => reviewKyc(latestKyc.id, 'VERIFIED')}>Valider le KYC</button>
              <button className="btn btn-danger" disabled={busy} onClick={() => reviewKyc(latestKyc.id, 'REJECTED')}>Rejeter</button>
            </div>
          </div>
        </>
      )}

      <div className="section-title">Positions</div>
      <div className="card">
        {user.positions.length === 0 ? (
          <div className="empty-state">Aucune position.</div>
        ) : (
          <table>
            <thead><tr><th>Valeur</th><th>Quantité</th></tr></thead>
            <tbody>
              {user.positions.map((p, i) => (
                <tr key={i}><td>{p.instrument.symbol} — {p.instrument.name}</td><td>{p.quantity}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section-title">Derniers ordres</div>
      <div className="card">
        {user.orders.length === 0 ? (
          <div className="empty-state">Aucun ordre.</div>
        ) : (
          <table>
            <thead><tr><th>Valeur</th><th>Sens</th><th>Quantité</th><th>Statut</th></tr></thead>
            <tbody>
              {user.orders.map((o) => (
                <tr key={o.id}><td>{o.instrument.symbol}</td><td>{o.side}</td><td>{o.quantity}</td><td><Badge value={o.status} /></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
