import { useEffect, useState } from 'react';
import { api } from '../api';
import Badge from '../components/Badge';

interface Market {
  id: string;
  code: string;
  name: string;
  currency: string;
  regulator: string;
  status: string;
  _count: { instruments: number; partners: number };
}

interface Instrument {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  currency: string;
  lastPrice: string | null;
  previousClose: string | null;
  market: { code: string };
}

export default function CatalogPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [marketFilter, setMarketFilter] = useState('');
  const [quoteModal, setQuoteModal] = useState<Instrument | null>(null);
  const [quoteForm, setQuoteForm] = useState({ tradeDate: new Date().toISOString().slice(0, 10), open: '', high: '', low: '', close: '' });
  const [busy, setBusy] = useState(false);

  const loadMarkets = () => api.get<Market[]>('/markets').then(setMarkets);
  const loadInstruments = () =>
    api.get<Instrument[]>(`/instruments${marketFilter ? `?marketId=${marketFilter}` : ''}`).then(setInstruments);

  useEffect(() => { loadMarkets(); }, []);
  useEffect(() => { loadInstruments(); }, [marketFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openQuoteModal = (instrument: Instrument) => {
    setQuoteModal(instrument);
    setQuoteForm({
      tradeDate: new Date().toISOString().slice(0, 10),
      open: instrument.lastPrice ?? '',
      high: instrument.lastPrice ?? '',
      low: instrument.lastPrice ?? '',
      close: instrument.lastPrice ?? '',
    });
  };

  const submitQuote = async () => {
    if (!quoteModal) return;
    setBusy(true);
    try {
      await api.post(`/instruments/${quoteModal.id}/quotes`, {
        tradeDate: quoteForm.tradeDate,
        open: Number(quoteForm.open),
        high: Number(quoteForm.high),
        low: Number(quoteForm.low),
        close: Number(quoteForm.close),
      });
      setQuoteModal(null);
      loadInstruments();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Catalogue</h1>
      <p className="page-subtitle">
        Module 3 — marchés BVMAC / BRVM / international, et saisie manuelle du Bulletin Officiel de
        Cotation en attendant un flux automatisé.
      </p>

      <div className="grid grid-3">
        {markets.map((m) => (
          <div className="card" key={m.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800 }}>{m.code}</div>
              <Badge value={m.status} />
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: '6px 0' }}>{m.name}</div>
            <div style={{ fontSize: 12.5 }}>{m.regulator} · {m.currency}</div>
            <div style={{ fontSize: 12.5, marginTop: 6 }}>{m._count.instruments} valeur(s) · {m._count.partners} partenaire(s)</div>
          </div>
        ))}
      </div>

      <div className="section-title">Valeurs cotées</div>
      <div className="toolbar">
        <select style={{ maxWidth: 240 }} value={marketFilter} onChange={(e) => setMarketFilter(e.target.value)}>
          <option value="">Tous les marchés</option>
          {markets.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
        </select>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Symbole</th><th>Nom</th><th>Marché</th><th>Type</th><th>Dernier cours</th><th>Clôture préc.</th><th /></tr>
          </thead>
          <tbody>
            {instruments.map((i) => (
              <tr key={i.id}>
                <td style={{ fontWeight: 700 }}>{i.symbol}</td>
                <td>{i.name}</td>
                <td>{i.market.code}</td>
                <td>{i.assetClass}</td>
                <td>{i.lastPrice ?? '—'} {i.currency}</td>
                <td>{i.previousClose ?? '—'}</td>
                <td><button className="btn btn-sm btn-outline" onClick={() => openQuoteModal(i)}>Mettre à jour le cours</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {quoteModal && (
        <div className="modal-backdrop" onClick={() => setQuoteModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cotation — {quoteModal.symbol}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Saisie manuelle depuis le Bulletin Officiel de Cotation (Guide ALKE-BOURSE, section 8.1).
            </p>
            <div className="form-row">
              <label>Date de séance</label>
              <input type="date" value={quoteForm.tradeDate} onChange={(e) => setQuoteForm({ ...quoteForm, tradeDate: e.target.value })} />
            </div>
            <div className="grid grid-2">
              <div className="form-row">
                <label>Ouverture</label>
                <input type="number" step="0.01" value={quoteForm.open} onChange={(e) => setQuoteForm({ ...quoteForm, open: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Clôture</label>
                <input type="number" step="0.01" value={quoteForm.close} onChange={(e) => setQuoteForm({ ...quoteForm, close: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Plus haut</label>
                <input type="number" step="0.01" value={quoteForm.high} onChange={(e) => setQuoteForm({ ...quoteForm, high: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Plus bas</label>
                <input type="number" step="0.01" value={quoteForm.low} onChange={(e) => setQuoteForm({ ...quoteForm, low: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="btn btn-primary" disabled={busy} onClick={submitQuote}>Enregistrer</button>
              <button className="btn btn-outline" onClick={() => setQuoteModal(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
