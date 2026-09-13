import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Order, OrderReviewInput, OrderStatus, PendingApproval } from '../api/types';
import { useAuth } from '../auth';
import ApprovalNotice from '../components/ApprovalNotice';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { CopyButton } from '../components/Copyable';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import { SelectField, TextAreaField, TextField } from '../components/Field';
import FilterBar, { FilterSelect, FilterText } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import Modal from '../components/Modal';
import Money from '../components/Money';
import PageHeader from '../components/PageHeader';
import { formatNumber, parseNumber } from '../format';
import { useBusy, useLoad } from '../hooks';
import { label, options } from '../labels';

const STATUS_FILTER: OrderStatus[] = ['PENDING', 'TRANSMITTED', 'ACKNOWLEDGED', 'PARTIALLY_EXECUTED', 'EXECUTED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'ADJUSTED'];
const REVIEW_STATUSES: OrderStatus[] = ['EXECUTED', 'PARTIALLY_EXECUTED', 'REJECTED', 'CANCELLED', 'ADJUSTED'];
const EXECUTED_STATUSES = new Set<OrderStatus>(['EXECUTED', 'PARTIALLY_EXECUTED', 'ADJUSTED']);
const REVIEWABLE = new Set<OrderStatus>(['PENDING', 'TRANSMITTED', 'ACKNOWLEDGED', 'PARTIALLY_EXECUTED']);

interface ReviewForm {
  status: OrderStatus;
  executedPrice: string;
  executedQuantity: string;
  sdbRef: string;
  reason: string;
}

type Errors = Record<string, string>;

function remainingQty(o: Order): number {
  return Math.max(0, parseNumber(o.quantity) - (parseNumber(o.filledQuantity) || 0));
}

function validateReview(f: ReviewForm, order: Order): Errors {
  const e: Errors = {};
  if (EXECUTED_STATUSES.has(f.status)) {
    const p = parseNumber(f.executedPrice);
    if (!Number.isFinite(p) || p <= 0) e.executedPrice = 'Indiquez un prix d’exécution strictement positif.';
  }
  if (f.status === 'PARTIALLY_EXECUTED') {
    const q = parseNumber(f.executedQuantity);
    const remaining = remainingQty(order);
    if (!Number.isFinite(q) || q <= 0) e.executedQuantity = 'Indiquez une quantité exécutée strictement positive.';
    else if (q > remaining) e.executedQuantity = `La quantité ne peut pas dépasser le reste à exécuter (${formatNumber(remaining)}).`;
  } else if (f.executedQuantity.trim()) {
    const q = parseNumber(f.executedQuantity);
    if (!Number.isFinite(q) || q <= 0) e.executedQuantity = 'Quantité invalide.';
  }
  if (f.reason.trim().length < 3) e.reason = 'Le motif est obligatoire.';
  return e;
}

export default function OrdersPage() {
  const { can } = useAuth();
  const review = can('orders.review');
  const f = useFilters({ marketId: '', status: '', batchId: '' });
  const { marketId, status, batchId } = f.values;

  const markets = useLoad(() => api.markets.list(), []);
  const orders = useLoad(() => api.orders.list({ marketId, status, batchId }), [marketId, status, batchId]);
  const { busy, run } = useBusy();

  const [reviewing, setReviewing] = useState<Order | null>(null);
  const [form, setForm] = useState<ReviewForm>({ status: 'EXECUTED', executedPrice: '', executedQuantity: '', sdbRef: '', reason: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [approval, setApproval] = useState<PendingApproval | null>(null);

  const openReview = (o: Order) => {
    setForm({ status: 'EXECUTED', executedPrice: o.estimatedPrice ?? '', executedQuantity: String(remainingQty(o)), sdbRef: o.sdbRef ?? '', reason: '' });
    setErrors({});
    setApproval(null);
    setReviewing(o);
  };

  const submitReview = async () => {
    if (!reviewing) return;
    const errs = validateReview(form, reviewing);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const body: OrderReviewInput = {
      status: form.status,
      executedPrice: EXECUTED_STATUSES.has(form.status) ? parseNumber(form.executedPrice) : undefined,
      executedQuantity: form.executedQuantity.trim() && EXECUTED_STATUSES.has(form.status) ? parseNumber(form.executedQuantity) : undefined,
      sdbRef: form.sdbRef.trim() || undefined,
      reason: form.reason.trim(),
    };
    const res = await run(() => api.orders.review(reviewing.id, body), 'Demande de revue créée : elle sera appliquée après validation à deux yeux.');
    if (res === undefined) return;
    setApproval(res);
    orders.reload();
  };

  const currencyOf = (o: Order) => o.instrument?.currency ?? 'XAF';
  const marketOptions = (markets.data ?? []).map((m) => ({ value: m.id, label: m.code }));

  return (
    <div>
      <PageHeader title="Ordres" subtitle="Suivez les ordres des clients et saisissez les exécutions confirmées par le partenaire boursier." breadcrumb={[{ label: 'Marchés' }, { label: 'Ordres' }]} />

      {approval && !reviewing && <ApprovalNotice approval={approval} />}

      <FilterBar active={f.active} onReset={f.reset} onRefresh={orders.reload} refreshing={orders.loading}>
        <FilterSelect label="Marché" value={marketId} onChange={(v) => f.set('marketId', v)} allLabel="Tous les marchés" options={marketOptions} />
        <FilterSelect label="Statut" value={status} onChange={(v) => f.set('status', v)} allLabel="Tous les statuts" options={options('order', STATUS_FILTER)} />
        <FilterText label="Identifiant de lot" placeholder="Identifiant complet du lot" value={batchId} onChange={(v) => f.set('batchId', v)} wide />
      </FilterBar>

      <div className="card card-table">
        <DataTable<Order>
          caption="Ordres"
          loading={orders.loading}
          rows={orders.data}
          rowKey={(o) => o.id}
          minWidth={960}
          empty={{
            kind: 'orders',
            title: f.active ? 'Aucun ordre pour ces filtres' : 'Aucun ordre',
            hint: f.active ? 'Élargissez les critères ou réinitialisez les filtres.' : 'Les ordres passés par les clients dans l’application apparaîtront ici.',
          }}
          columns={[
            { key: 'date', header: 'Soumis le', nowrap: true, render: (o) => <DateTime value={o.submittedAt} /> },
            {
              key: 'user',
              header: 'Client',
              render: (o) => (
                <>
                  <strong>{o.user?.fullName}</strong>
                  <span className="cell-sub">{o.user?.email}</span>
                </>
              ),
            },
            { key: 'market', header: 'Marché', priority: 'secondary', render: (o) => o.market?.code },
            {
              key: 'instr',
              header: 'Valeur',
              render: (o) => (
                <span title={o.instrument?.name}>
                  <strong>{o.instrument?.symbol}</strong>
                  {o.instrument?.isin && <span className="cell-sub mono">{o.instrument.isin}</span>}
                </span>
              ),
            },
            { key: 'side', header: 'Sens', render: (o) => <Badge kind="orderSide" value={o.side} /> },
            { key: 'qty', header: 'Quantité', align: 'right', numeric: true, render: (o) => formatNumber(o.quantity) },
            { key: 'price', header: 'Prix estimé', align: 'right', numeric: true, priority: 'secondary', render: (o) => <Money value={o.estimatedPrice} currency={currencyOf(o)} /> },
            { key: 'max', header: 'Montant max', align: 'right', numeric: true, priority: 'detail', render: (o) => <Money value={o.maxAmount} currency={currencyOf(o)} /> },
            {
              key: 'filled',
              header: 'Exécuté',
              align: 'right',
              numeric: true,
              priority: 'secondary',
              render: (o) => (
                <>
                  {formatNumber(o.filledQuantity)}
                  {o.avgExecutedPrice && (
                    <span className="cell-sub">
                      <Money value={o.avgExecutedPrice} currency={currencyOf(o)} />
                    </span>
                  )}
                </>
              ),
            },
            { key: 'status', header: 'Statut', render: (o) => <Badge kind="order" value={o.status} /> },
            { key: 'sim', header: 'Mode', priority: 'detail', render: (o) => <Badge kind="liveTrading" value={o.simulated ? 'SIMULATED' : 'LIVE'} /> },
            { key: 'sdb', header: 'Réf. SDB', priority: 'detail', render: (o) => (o.sdbRef ? <span className="mono">{o.sdbRef}</span> : <span className="muted">—</span>) },
            {
              key: 'batch',
              header: 'Lot',
              priority: 'detail',
              render: (o) =>
                o.batchId ? (
                  <span className="copyable">
                    <Link to={`/batches?id=${o.batchId}`} title={o.batchId} className="mono">
                      {o.batchId.slice(0, 8)}…
                    </Link>
                    <CopyButton value={o.batchId} what="l’identifiant du lot" />
                  </span>
                ) : (
                  <span className="muted">—</span>
                ),
            },
            {
              key: 'actions',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              render: (o) =>
                review && REVIEWABLE.has(o.status) ? (
                  <Button size="sm" onClick={() => openReview(o)}>
                    Traiter
                  </Button>
                ) : null,
            },
          ]}
        />
      </div>

      {reviewing && (
        <Modal
          title={`Revue — ${reviewing.instrument?.symbol} · ${label('orderSide', reviewing.side).toLowerCase()} ${formatNumber(reviewing.quantity)}`}
          description={
            <>
              {reviewing.user?.fullName} · {reviewing.market?.code} · statut actuel <Badge kind="order" value={reviewing.status} /> · reste à exécuter {formatNumber(remainingQty(reviewing))} · prix estimé{' '}
              <Money value={reviewing.estimatedPrice} currency={currencyOf(reviewing)} />
            </>
          }
          onClose={() => setReviewing(null)}
          width={600}
          footer={
            <>
              <Button onClick={() => setReviewing(null)} disabled={busy}>
                {approval ? 'Fermer' : 'Annuler'}
              </Button>
              {!approval && (
                <Button variant="primary" onClick={() => void submitReview()} busy={busy}>
                  Soumettre la revue
                </Button>
              )}
            </>
          }
        >
          {approval ? (
            <ApprovalNotice approval={approval} />
          ) : (
            <>
              <ApprovalNotice />
              <SelectField label="Résultat" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })} required>
                {options('order', REVIEW_STATUSES).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </SelectField>
              {EXECUTED_STATUSES.has(form.status) && (
                <div className="grid grid-2">
                  <TextField
                    label={`Prix d’exécution (${currencyOf(reviewing)})`}
                    inputMode="decimal"
                    value={form.executedPrice}
                    onChange={(e) => setForm({ ...form, executedPrice: e.target.value })}
                    error={errors.executedPrice}
                    required
                  />
                  <TextField
                    label="Quantité exécutée"
                    inputMode="numeric"
                    value={form.executedQuantity}
                    onChange={(e) => setForm({ ...form, executedQuantity: e.target.value })}
                    error={errors.executedQuantity}
                    hint={`Reste à exécuter : ${formatNumber(remainingQty(reviewing))}${form.status === 'PARTIALLY_EXECUTED' ? '' : ' (optionnel)'}`}
                    required={form.status === 'PARTIALLY_EXECUTED'}
                  />
                </div>
              )}
              <TextField label="Référence SDB" value={form.sdbRef} onChange={(e) => setForm({ ...form, sdbRef: e.target.value })} placeholder="N° de confirmation partenaire" hint="Optionnelle." />
              <TextAreaField label="Motif" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} error={errors.reason} required hint="Tracé dans le journal d’audit et visible du valideur." />
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
