import { useEffect, useState } from 'react';
import { api } from '../api';

interface Fee {
  id: string;
  feeType: string;
  isPercentage: boolean;
  value: string;
  label: string;
  market: { code: string } | null;
}

interface Market { id: string; code: string; }

export default function FeesPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [form, setForm] = useState({ marketId: '', feeType: 'BROKERAGE', isPercentage: true, value: '', label: '' });
  const [busy, setBusy] = useState(false);

  const load = () => api.get<Fee[]>('/fees').then(setFees);
  useEffect(() => {
    load();
    api.get<Market[]>('/markets').then(setMarkets);
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/fees', {
        marketId: form.marketId || undefined,
        feeType: form.feeType,
        isPercentage: form.isPercentage,
        value: Number(form.value),
        label: form.label,
      });
      setForm({ marketId: '', feeType: 'BROKERAGE', isPercentage: true, value: '', label: '' });
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await api.delete(`/fees/${id}`);
    load();
  };

  return (
    <div>
      <h1 className="page-title">Grille tarifaire</h1>
      <p className="page-subtitle">Module 9.5 — frais de courtage par marché, frais de change.</p>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Ajouter un frais</div>
          <div className="form-row">
            <label>Marché (vide = global)</label>
            <select value={form.marketId} onChange={(e) => setForm({ ...form, marketId: e.target.value })}>
              <option value="">Global (tous marchés)</option>
              {markets.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Type de frais</label>
            <select value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })}>
              <option value="BROKERAGE">Courtage</option>
              <option value="FX_SPREAD">Change (FX)</option>
              <option value="MANAGEMENT">Gestion</option>
              <option value="WITHDRAWAL">Retrait</option>
            </select>
          </div>
          <div className="form-row">
            <label>Type de valeur</label>
            <select value={form.isPercentage ? '1' : '0'} onChange={(e) => setForm({ ...form, isPercentage: e.target.value === '1' })}>
              <option value="1">Pourcentage</option>
              <option value="0">Montant fixe</option>
            </select>
          </div>
          <div className="form-row">
            <label>Valeur</label>
            <input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Libellé</label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex. Frais de courtage BVMAC" />
          </div>
          <button className="btn btn-primary" disabled={busy || !form.value || !form.label} onClick={submit}>Ajouter</button>
        </div>

        <div className="card">
          <table>
            <thead><tr><th>Libellé</th><th>Marché</th><th>Type</th><th>Valeur</th><th /></tr></thead>
            <tbody>
              {fees.map((f) => (
                <tr key={f.id}>
                  <td>{f.label}</td>
                  <td>{f.market?.code ?? 'Global'}</td>
                  <td>{f.feeType}</td>
                  <td>{f.value}{f.isPercentage ? ' %' : ''}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => remove(f.id)}>Désactiver</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
