import { useMemo, useState } from 'react';
import { api } from '../api';
import type { Instrument, InstrumentInput, Market, PendingApproval, QuoteInput } from '../api/types';
import { useAuth } from '../auth';
import ApprovalNotice from '../components/ApprovalNotice';
import Badge from '../components/Badge';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import { SelectField, TextAreaField, TextField } from '../components/Field';
import FilterBar, { FilterSelect } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import Modal from '../components/Modal';
import Money from '../components/Money';
import PageHeader from '../components/PageHeader';
import { formatNumber, parseNumber, todayIso } from '../format';
import { useBusy, useLoad } from '../hooks';
import { label } from '../labels';

type Errors = Record<string, string>;

interface InstrumentForm {
  marketId: string;
  symbol: string;
  isin: string;
  name: string;
  sector: string;
  assetClass: 'STOCK' | 'BOND';
  lotSize: string;
  currency: string;
  isActive: boolean;
}

const EMPTY_INSTRUMENT: InstrumentForm = { marketId: '', symbol: '', isin: '', name: '', sector: '', assetClass: 'STOCK', lotSize: '1', currency: 'XAF', isActive: true };

interface QuoteForm {
  tradeDate: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

const ISIN_RE = /^[A-Z0-9]{12}$/;

function validateInstrument(f: InstrumentForm): Errors {
  const e: Errors = {};
  if (!f.marketId) e.marketId = 'Le marché est obligatoire.';
  if (!f.symbol.trim()) e.symbol = 'Le symbole est obligatoire.';
  if (!f.name.trim()) e.name = 'Le nom est obligatoire.';
  const isin = f.isin.trim().toUpperCase();
  if (isin && !ISIN_RE.test(isin)) e.isin = 'Un ISIN comporte 12 caractères alphanumériques.';
  const lot = Number(f.lotSize);
  if (!Number.isInteger(lot) || lot <= 0) e.lotSize = 'La quotité est un entier strictement positif.';
  if (!/^[A-Z]{3}$/.test(f.currency.trim().toUpperCase())) e.currency = 'Code devise ISO à 3 lettres (ex. XAF).';
  return e;
}

function validateQuote(f: QuoteForm): Errors {
  const e: Errors = {};
  const fields: (keyof QuoteForm)[] = ['open', 'high', 'low', 'close'];
  const values: Partial<Record<keyof QuoteForm, number>> = {};
  for (const k of fields) {
    const n = parseNumber(f[k]);
    if (!Number.isFinite(n) || n <= 0) e[k] = 'Nombre strictement positif requis.';
    else values[k] = n;
  }
  if (values.high !== undefined && values.low !== undefined && values.high < values.low) e.high = 'Le plus haut doit être supérieur ou égal au plus bas.';
  if (!f.tradeDate) e.tradeDate = 'La date de séance est obligatoire.';
  else if (f.tradeDate > todayIso()) e.tradeDate = 'La date de séance ne peut pas être dans le futur.';
  if (f.volume.trim()) {
    const v = parseNumber(f.volume);
    if (!Number.isInteger(v) || v < 0) e.volume = 'Le volume est un entier positif ou nul.';
  }
  return e;
}

export default function CatalogPage() {
  const { can } = useAuth();
  const manage = can('catalog.manage');
  const markets = useLoad(() => api.markets.list(), []);
  const f = useFilters({ marketId: '' });
  const marketFilter = f.values.marketId;
  const instruments = useLoad(() => api.instruments.list({ marketId: marketFilter }), [marketFilter]);
  const { busy, run } = useBusy();
  const [approval, setApproval] = useState<PendingApproval | null>(null);

  const [liveTarget, setLiveTarget] = useState<Market | null>(null);
  const [liveReason, setLiveReason] = useState('');
  const [liveError, setLiveError] = useState<string | null>(null);

  const [editor, setEditor] = useState<{ mode: 'create' } | { mode: 'edit'; instrument: Instrument } | null>(null);
  const [form, setForm] = useState<InstrumentForm>(EMPTY_INSTRUMENT);
  const [errors, setErrors] = useState<Errors>({});

  const [quoteTarget, setQuoteTarget] = useState<Instrument | null>(null);
  const [quote, setQuote] = useState<QuoteForm>({ tradeDate: todayIso(), open: '', high: '', low: '', close: '', volume: '' });
  const [quoteErrors, setQuoteErrors] = useState<Errors>({});

  const marketById = useMemo(() => new Map((markets.data ?? []).map((m) => [m.id, m])), [markets.data]);

  const submitLive = async () => {
    if (!liveTarget) return;
    if (liveReason.trim().length < 5) {
      setLiveError('Indiquez un motif (5 caractères minimum).');
      return;
    }
    const res = await run(() => api.markets.setLiveTrading(liveTarget.id, { liveTrading: !liveTarget.liveTrading, reason: liveReason.trim() }));
    if (res === undefined) return;
    setApproval(res);
    setLiveTarget(null);
    setLiveReason('');
    markets.reload();
  };

  const openCreate = () => {
    const marketId = marketFilter || markets.data?.[0]?.id || '';
    setForm({ ...EMPTY_INSTRUMENT, marketId, currency: marketById.get(marketId)?.currency ?? 'XAF' });
    setErrors({});
    setEditor({ mode: 'create' });
  };

  const openEdit = (i: Instrument) => {
    setForm({ marketId: i.marketId, symbol: i.symbol, isin: i.isin ?? '', name: i.name, sector: i.sector ?? '', assetClass: i.assetClass, lotSize: String(i.lotSize), currency: i.currency, isActive: i.isActive });
    setErrors({});
    setEditor({ mode: 'edit', instrument: i });
  };

  const submitInstrument = async () => {
    if (!editor) return;
    const errs = validateInstrument(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const body: InstrumentInput = {
      marketId: form.marketId,
      symbol: form.symbol.trim().toUpperCase(),
      isin: form.isin.trim() ? form.isin.trim().toUpperCase() : undefined,
      name: form.name.trim(),
      sector: form.sector.trim() || undefined,
      assetClass: form.assetClass,
      currency: form.currency.trim().toUpperCase(),
      lotSize: Number(form.lotSize),
      isActive: form.isActive,
    };
    const res = await run(() => (editor.mode === 'edit' ? api.instruments.update(editor.instrument.id, body) : api.instruments.create(body)), editor.mode === 'edit' ? 'Valeur mise à jour.' : 'Valeur créée.');
    if (res !== undefined) {
      setEditor(null);
      instruments.reload();
      markets.reload();
    }
  };

  const openQuote = (i: Instrument) => {
    const last = i.lastPrice ?? '';
    setQuote({ tradeDate: todayIso(), open: last, high: last, low: last, close: last, volume: '' });
    setQuoteErrors({});
    setQuoteTarget(i);
  };

  const submitQuote = async () => {
    if (!quoteTarget) return;
    const errs = validateQuote(quote);
    setQuoteErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const body: QuoteInput = {
      tradeDate: quote.tradeDate,
      open: parseNumber(quote.open),
      high: parseNumber(quote.high),
      low: parseNumber(quote.low),
      close: parseNumber(quote.close),
      volume: quote.volume.trim() ? parseNumber(quote.volume) : undefined,
    };
    const res = await run(() => api.instruments.addQuote(quoteTarget.id, body), `Cotation ${quoteTarget.symbol} enregistrée.`);
    if (res !== undefined) {
      setQuoteTarget(null);
      instruments.reload();
    }
  };

  const onMarketChange = (marketId: string) => {
    const m = marketById.get(marketId);
    setForm((prev) => ({ ...prev, marketId, currency: m?.currency ?? prev.currency }));
  };

  const marketOptions = (markets.data ?? []).map((m) => ({ value: m.id, label: `${m.code} — ${m.name}` }));

  return (
    <div>
      <PageHeader
        title="Catalogue"
        subtitle="Gérez les marchés et les valeurs négociables, saisissez les cours du bulletin officiel et décidez du passage d’un marché en réel."
        breadcrumb={[{ label: 'Marchés' }, { label: 'Catalogue' }]}
        actions={
          manage ? (
            <Button variant="primary" onClick={openCreate} disabled={!markets.data?.length}>
              Nouvelle valeur
            </Button>
          ) : undefined
        }
      />

      {approval && <ApprovalNotice approval={approval} message="Le basculement du marché a été soumis à validation." />}

      <section className="section section-first" aria-labelledby="markets-title">
        <div className="section-head">
          <h2 id="markets-title" className="section-title">
            Marchés
          </h2>
        </div>
        <div className="card card-table">
          <DataTable<Market>
            caption="Marchés"
            loading={markets.loading}
            rows={markets.data}
            rowKey={(m) => m.id}
            empty={{ kind: 'files', title: 'Aucun marché configuré', hint: 'Les marchés sont créés par l’équipe technique lors de l’initialisation de la plateforme.' }}
            columns={[
              { key: 'code', header: 'Code', render: (m) => <strong>{m.code}</strong> },
              { key: 'name', header: 'Nom', render: (m) => m.name },
              { key: 'regulator', header: 'Régulateur', priority: 'detail', render: (m) => m.regulator },
              { key: 'currency', header: 'Devise', priority: 'secondary', render: (m) => m.currency },
              { key: 'status', header: 'Statut', render: (m) => <Badge kind="market" value={m.status} /> },
              { key: 'live', header: 'Mode', render: (m) => <Badge kind="liveTrading" value={m.liveTrading ? 'LIVE' : 'SIMULATED'} /> },
              { key: 'settlement', header: 'Règlement / cut-off', priority: 'secondary', nowrap: true, numeric: true, render: (m) => `J+${m.settlementDays} · ${m.cutoffTime}${m.timezone ? ` (${m.timezone})` : ''}` },
              { key: 'counts', header: 'Valeurs / partenaires', align: 'right', numeric: true, priority: 'detail', render: (m) => (m._count ? `${m._count.instruments} / ${m._count.partners}` : '—') },
              {
                key: 'actions',
                header: <span className="sr-only">Actions</span>,
                align: 'right',
                render: (m) =>
                  manage ? (
                    <Button
                      size="sm"
                      variant={m.liveTrading ? 'outline' : 'green'}
                      onClick={() => {
                        setLiveReason('');
                        setLiveError(null);
                        setLiveTarget(m);
                      }}
                    >
                      {m.liveTrading ? 'Basculer en simulation' : 'Basculer en réel'}
                    </Button>
                  ) : null,
              },
            ]}
          />
        </div>
      </section>

      <section className="section" aria-labelledby="instr-title">
        <div className="section-head">
          <h2 id="instr-title" className="section-title">
            Valeurs cotées
          </h2>
        </div>
        <FilterBar active={f.active} onReset={f.reset} onRefresh={instruments.reload} refreshing={instruments.loading}>
          <FilterSelect label="Marché" value={marketFilter} onChange={(v) => f.set('marketId', v)} allLabel="Tous les marchés" options={marketOptions} wide />
        </FilterBar>

        <div className="card card-table">
          <DataTable<Instrument>
            caption="Valeurs cotées"
            loading={instruments.loading}
            rows={instruments.data}
            rowKey={(i) => i.id}
            empty={{
              kind: 'files',
              title: f.active ? 'Aucune valeur sur ce marché' : 'Aucune valeur au catalogue',
              hint: 'Ajoutez les actions et obligations que les clients pourront négocier.',
              action: manage ? (
                <Button variant="primary" onClick={openCreate} disabled={!markets.data?.length}>
                  Nouvelle valeur
                </Button>
              ) : undefined,
            }}
            columns={[
              { key: 'symbol', header: 'Symbole', render: (i) => <strong>{i.symbol}</strong> },
              { key: 'isin', header: 'ISIN', priority: 'secondary', render: (i) => (i.isin ? <span className="mono">{i.isin}</span> : <span className="muted">—</span>) },
              { key: 'name', header: 'Nom', render: (i) => i.name },
              { key: 'market', header: 'Marché', priority: 'secondary', render: (i) => i.market?.code ?? marketById.get(i.marketId)?.code ?? '—' },
              { key: 'class', header: 'Classe', priority: 'detail', render: (i) => <Badge kind="assetClass" value={i.assetClass} /> },
              { key: 'sector', header: 'Secteur', priority: 'detail', render: (i) => i.sector ?? <span className="muted">—</span> },
              { key: 'lot', header: 'Quotité', align: 'right', numeric: true, priority: 'detail', render: (i) => formatNumber(i.lotSize) },
              { key: 'last', header: 'Dernier cours', align: 'right', numeric: true, render: (i) => <Money value={i.lastPrice} currency={i.currency} /> },
              { key: 'prev', header: 'Clôture préc.', align: 'right', numeric: true, priority: 'secondary', render: (i) => <Money value={i.previousClose} currency={i.currency} /> },
              { key: 'active', header: 'Négociable', render: (i) => <Badge kind="boolean" value={i.isActive} /> },
              {
                key: 'actions',
                header: <span className="sr-only">Actions</span>,
                align: 'right',
                render: (i) =>
                  manage ? (
                    <div className="actions-inline">
                      <Button size="sm" onClick={() => openQuote(i)}>
                        Saisir un cours
                      </Button>
                      <Button size="sm" onClick={() => openEdit(i)}>
                        Modifier
                      </Button>
                    </div>
                  ) : null,
              },
            ]}
          />
        </div>
      </section>

      {liveTarget && (
        <Modal
          title={`${liveTarget.code} — ${liveTarget.liveTrading ? 'Basculer en simulation' : 'Basculer en réel'}`}
          description={
            liveTarget.liveTrading
              ? 'Les nouveaux ordres sur ce marché seront traités en mode simulé, sans transmission au partenaire.'
              : 'Les nouveaux ordres sur ce marché seront transmis réellement au partenaire boursier actif.'
          }
          onClose={() => setLiveTarget(null)}
          footer={
            <>
              <Button onClick={() => setLiveTarget(null)} disabled={busy}>
                Annuler
              </Button>
              <Button variant={liveTarget.liveTrading ? 'primary' : 'green'} onClick={() => void submitLive()} busy={busy}>
                Soumettre la demande
              </Button>
            </>
          }
        >
          <ApprovalNotice />
          <TextAreaField
            label="Motif"
            hint="Tracé dans le journal d’audit et visible du valideur."
            rows={3}
            value={liveReason}
            onChange={(e) => {
              setLiveReason(e.target.value);
              setLiveError(null);
            }}
            error={liveError}
            required
            autoFocus
          />
        </Modal>
      )}

      {editor && (
        <Modal
          title={editor.mode === 'edit' ? `Modifier ${editor.instrument.symbol}` : 'Nouvelle valeur'}
          onClose={() => setEditor(null)}
          width={600}
          footer={
            <>
              <Button onClick={() => setEditor(null)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="primary" onClick={() => void submitInstrument()} busy={busy}>
                Enregistrer
              </Button>
            </>
          }
        >
          <div className="grid grid-2">
            <SelectField label="Marché" value={form.marketId} onChange={(e) => onMarketChange(e.target.value)} error={errors.marketId} disabled={editor.mode === 'edit'} required>
              <option value="">— Choisir —</option>
              {(markets.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Classe d’actif" value={form.assetClass} onChange={(e) => setForm({ ...form, assetClass: e.target.value as 'STOCK' | 'BOND' })} required>
              <option value="STOCK">{label('assetClass', 'STOCK')}</option>
              <option value="BOND">{label('assetClass', 'BOND')}</option>
            </SelectField>
            <TextField label="Symbole" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} error={errors.symbol} required autoFocus />
            <TextField label="ISIN" value={form.isin} onChange={(e) => setForm({ ...form, isin: e.target.value })} error={errors.isin} maxLength={12} placeholder="12 caractères" hint="Optionnel." />
          </div>
          <TextField label="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
          <div className="grid grid-2">
            <TextField label="Secteur" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} hint="Optionnel." />
            <TextField label="Quotité (lot)" type="number" min={1} step={1} value={form.lotSize} onChange={(e) => setForm({ ...form, lotSize: e.target.value })} error={errors.lotSize} required />
            <TextField label="Devise" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} error={errors.currency} maxLength={3} required />
            <SelectField label="Négociable" value={form.isActive ? '1' : '0'} onChange={(e) => setForm({ ...form, isActive: e.target.value === '1' })} hint="Une valeur masquée n’apparaît plus dans l’application client.">
              <option value="1">Oui</option>
              <option value="0">Non — masquée</option>
            </SelectField>
          </div>
        </Modal>
      )}

      {quoteTarget && (
        <Modal
          title={`Cotation — ${quoteTarget.symbol}`}
          description={`Saisie manuelle depuis le bulletin officiel de cotation. Montants en ${quoteTarget.currency}.`}
          onClose={() => setQuoteTarget(null)}
          footer={
            <>
              <Button onClick={() => setQuoteTarget(null)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="primary" onClick={() => void submitQuote()} busy={busy}>
                Enregistrer
              </Button>
            </>
          }
        >
          <TextField label="Date de séance" type="date" max={todayIso()} value={quote.tradeDate} onChange={(e) => setQuote({ ...quote, tradeDate: e.target.value })} error={quoteErrors.tradeDate} required />
          <div className="grid grid-2">
            <TextField label="Ouverture" inputMode="decimal" value={quote.open} onChange={(e) => setQuote({ ...quote, open: e.target.value })} error={quoteErrors.open} required />
            <TextField label="Clôture" inputMode="decimal" value={quote.close} onChange={(e) => setQuote({ ...quote, close: e.target.value })} error={quoteErrors.close} required />
            <TextField label="Plus haut" inputMode="decimal" value={quote.high} onChange={(e) => setQuote({ ...quote, high: e.target.value })} error={quoteErrors.high} required />
            <TextField label="Plus bas" inputMode="decimal" value={quote.low} onChange={(e) => setQuote({ ...quote, low: e.target.value })} error={quoteErrors.low} required />
          </div>
          <TextField label="Volume" inputMode="numeric" value={quote.volume} onChange={(e) => setQuote({ ...quote, volume: e.target.value })} error={quoteErrors.volume} hint="Optionnel." />
        </Modal>
      )}
    </div>
  );
}
