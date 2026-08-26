import { useEffect, useState } from 'react';
import { api } from '../api';
import Badge from '../components/Badge';

interface PendingTx {
  id: string;
  type: string;
  amount: string;
  status: string;
  provider: string;
  createdAt: string;
  account: { currency: string; user: { fullName: string; email: string } };
}

export default function WalletPage() {
  const [items, setItems] = useState<PendingTx[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => api.get<PendingTx[]>('/wallet/admin/pending').then(setItems);
  useEffect(() => { load(); }, []);

  const complete = async (id: string) => {
    setBusy(id);
    try {
      await api.post(`/wallet/admin/${id}/complete`);
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="page-title">Dépôts & retraits en attente</h1>
      <p className="page-subtitle">
        En dehors du mode démo, chaque dépôt/retrait attend la confirmation du fournisseur de paiement réel
        (MTN MoMo, Orange Money, CinetPay). En attendant, un administrateur peut forcer la complétion ici.
      </p>

      <div className="card">
        {items.length === 0 ? (
          <div className="empty-state">Aucune transaction en attente.</div>
        ) : (
          <table>
            <thead><tr><th>Client</th><th>Type</th><th>Montant</th><th>Fournisseur</th><th>Date</th><th /></tr></thead>
            <tbody>
              {items.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.account.user.fullName}<br /><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{tx.account.user.email}</span></td>
                  <td><Badge value={tx.type} /></td>
                  <td>{tx.amount} {tx.account.currency}</td>
                  <td>{tx.provider}</td>
                  <td>{new Date(tx.createdAt).toLocaleString('fr-FR')}</td>
                  <td>
                    <button className="btn btn-sm btn-green" disabled={busy === tx.id} onClick={() => complete(tx.id)}>
                      Marquer complété
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
