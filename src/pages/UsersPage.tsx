import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Badge from '../components/Badge';

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  kycStatus: string;
  role: string;
  isBlocked: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [kycStatus, setKycStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (kycStatus) params.set('kycStatus', kycStatus);
    api
      .get<{ items: UserRow[]; total: number }>(`/admin/users?${params.toString()}`)
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="page-title">Utilisateurs & KYC</h1>
      <p className="page-subtitle">Module 9.1 — vue liste, statut KYC, validation manuelle des dossiers.</p>

      <div className="toolbar">
        <input
          style={{ maxWidth: 280 }}
          placeholder="Rechercher (nom, e-mail, téléphone)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <select style={{ maxWidth: 220 }} value={kycStatus} onChange={(e) => setKycStatus(e.target.value)}>
          <option value="">Tous les statuts KYC</option>
          <option value="NOT_STARTED">Non démarré</option>
          <option value="PENDING">En attente</option>
          <option value="IN_REVIEW">En cours de vérification</option>
          <option value="VERIFIED">Validé</option>
          <option value="REJECTED">Rejeté</option>
        </select>
        <button className="btn btn-outline" onClick={load}>Filtrer</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">Aucun utilisateur trouvé.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Contact</th>
                <th>Pays</th>
                <th>KYC</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                  <td>{u.email}<br /><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.phone}</span></td>
                  <td>{u.country}</td>
                  <td><Badge value={u.kycStatus} /></td>
                  <td>{u.role}</td>
                  <td>{u.isBlocked ? <Badge value="REJECTED" /> : <Badge value="ACTIVE" />}</td>
                  <td><Link className="btn btn-sm btn-outline" to={`/users/${u.id}`}>Voir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
