import { useMemo, useState } from 'react';
import { api } from '../api';
import type { FeeChangeInput, FeeSchedule, FeeType, PendingApproval } from '../api/types';
import { useAuth } from '../auth';
import ApprovalNotice from '../components/ApprovalNotice';
import Badge from '../components/Badge';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import { SelectField, TextAreaField, TextField } from '../components/Field';
import FilterBar, { FilterSelect } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import Modal from '../components/Modal';
import Money from '../components/Money';
import PageHeader from '../components/PageHeader';
import { formatNumber, parseNumber } from '../format';
import { useBusy, useLoad } from '../hooks';
import { label, options } from '../labels';

const FEE_TYPES: FeeType[] = ['COURTAGE_SDB', 'COMMISSION_ALKE', 'FX_SPREAD', 'TAXE', 'WITHDRAWAL'];

interface FeeForm {
  marketId: string;
  feeType: FeeType;
  isPercentage: boolean;
  value: string;
  minAmount: string;
  maxAmount: string;
  label: string;
  reason: string;
}

const EMPTY: FeeForm = { marketId: '', feeType: 'COMMISSION_ALKE', isPercentage: true, value: '', minAmount: '', maxAmount: '', label: '', reason: '' };

type Errors = Record<string, string>;

function validate(f: FeeForm): Errors {
  const e: Errors = {};
  const v = parseNumber(f.value);
  if (!Number.isFinite(v) || v < 0) e.value = 'Indiquez une valeur numérique positive ou nulle.';
  else if (f.isPercentage && v > 100) e.value = 'Un pourcentage ne peut pas dépasser 100.';
  const min = f.minAmount.trim() ? parseNumber(f.minAmount) : undefined;
  const max = f.maxAmount.trim() ? parseNumber(f.maxAmount) : undefined;
  if (min !== undefined && (!Number.isFinite(min) || min < 0)) e.minAmount = 'Montant minimum invalide.';
  if (max !== undefined && (!Number.isFinite(max) || max < 0)) e.maxAmount = 'Montant maximum invalide.';
  if (min !== undefined && max !== undefined && !e.minAmount && !e.maxAmount && min > max) e.maxAmount = 'Le maximum doit être supérieur ou égal au minimum.';
  if (!f.label.trim()) e.label = 'Le libellé est obligatoire.';
  if (f.reason.trim().length < 5) e.reason = 'Le motif est obligatoire (5 caractères minimum).';
  return e;
}

export default function FeesPage() {
  const { can } = useAuth();
  const change = can('fees.change');
  const f = useFilters({ marketId: '' });
  const marketFilter = f.values.marketId;
  const markets = useLoad(() => api.markets.list(), []);
  const fees = useLoad(() => api.fees.list({ marketId: marketFilter }), [marketFilter]);
  const { busy, run } = useBusy();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FeeForm>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [approval, setApproval] = useState<PendingApproval | null>(null);

  const currencyByCode = useMemo(() => new Map((markets.data ?? []).map((m) => [m.code, m.currency])), [markets.data]);
  const currencyOf = (fee: FeeSchedule) => (fee.market?.code ? currencyByCode.get(fee.market.code) : undefined) ?? 'XAF';

  const openNew = () => {
    setForm({ ...EMPTY, marketId: marketFilter });
    setErrors({});
    setOpen(true);
  };

  const openFrom = (fee: FeeSchedule) => {
    setForm({ marketId: fee.marketId ?? '', feeType: fee.feeType, isPercentage: fee.isPercentage, value: fee.value, minAmount: fee.minAmount ?? '', maxAmount: fee.maxAmount ?? '', label: fee.label, reason: '' });
    setErrors({});
    setOpen(true);
  };

  const submit = async () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const body: FeeChangeInput = {
      marketId: form.marketId || undefined,
      feeType: form.feeType,
      isPercentage: form.isPercentage,
      value: parseNumber(form.value),
      minAmount: form.minAmount.trim() ? parseNumber(form.minAmount) : undefined,
      maxAmount: form.maxAmount.trim() ? parseNumber(form.maxAmount) : undefined,
      label: form.label.trim(),
      reason: form.reason.trim(),
    };
    const res = await run(() => api.fees.requestChange(body), 'Proposition de modification soumise à validation à deux yeux.');
    if (res === undefined) return;
    setApproval(res);
    setOpen(false);
  };

  const marketOptions = (markets.data ?? []).map((m) => ({ value: m.id, label: m.code }));

  return (
    <div>
      <PageHeader
        title="Grille tarifaire"
        subtitle="Consultez les frais appliqués aux clients par marché et proposez une modification, qui prend effet une fois validée par un second opérateur."
        breadcrumb={[{ label: 'Finance' }, { label: 'Frais' }]}
        actions={
          change ? (
            <Button variant="primary" onClick={openNew}>
              Proposer une modification
            </Button>
          ) : undefined
        }
      />

      {approval && <ApprovalNotice approval={approval} message="La modification tarifaire a été soumise à validation." />}

      <FilterBar active={f.active} onReset={f.reset} onRefresh={fees.reload} refreshing={fees.loading}>
        <FilterSelect label="Marché" value={marketFilter} onChange={(v) => f.set('marketId', v)} allLabel="Tous les marchés" options={marketOptions} />
      </FilterBar>

      <div className="card card-table">
        <DataTable<FeeSchedule>
          caption="Barèmes"
          loading={fees.loading}
          rows={fees.data}
          rowKey={(fee) => fee.id}
          empty={{
            kind: 'money',
            title: 'Aucun barème',
            hint: 'Les frais de courtage, commissions et taxes en vigueur apparaîtront ici.',
            action: change ? (
              <Button variant="primary" onClick={openNew}>
                Proposer un barème
              </Button>
            ) : undefined,
          }}
          columns={[
            { key: 'label', header: 'Libellé', render: (fee) => <strong>{fee.label}</strong> },
            { key: 'market', header: 'Marché', render: (fee) => fee.market?.code ?? <span className="muted">Global</span> },
            { key: 'type', header: 'Type', priority: 'secondary', render: (fee) => label('fee', fee.feeType) },
            { key: 'value', header: 'Valeur', align: 'right', numeric: true, render: (fee) => (fee.isPercentage ? `${formatNumber(fee.value)} %` : <Money value={fee.value} currency={currencyOf(fee)} />) },
            {
              key: 'bounds',
              header: 'Min / max',
              align: 'right',
              numeric: true,
              priority: 'detail',
              render: (fee) =>
                fee.minAmount || fee.maxAmount ? (
                  <>
                    {fee.minAmount ? <Money value={fee.minAmount} currency={currencyOf(fee)} /> : '—'} / {fee.maxAmount ? <Money value={fee.maxAmount} currency={currencyOf(fee)} /> : '—'}
                  </>
                ) : (
                  <span className="muted">—</span>
                ),
            },
            { key: 'from', header: 'Effet du', priority: 'secondary', nowrap: true, render: (fee) => <DateTime value={fee.effectiveFrom} dateOnly /> },
            { key: 'to', header: 'Effet au', priority: 'detail', nowrap: true, render: (fee) => (fee.effectiveTo ? <DateTime value={fee.effectiveTo} dateOnly /> : <span className="muted">en cours</span>) },
            { key: 'active', header: 'Actif', render: (fee) => <Badge kind="boolean" value={fee.isActive} /> },
            {
              key: 'actions',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              render: (fee) =>
                change ? (
                  <Button size="sm" onClick={() => openFrom(fee)}>
                    Modifier
                  </Button>
                ) : null,
            },
          ]}
        />
      </div>

      {open && (
        <Modal
          title="Proposer une modification tarifaire"
          description="Le nouveau barème prend effet à son approbation et clôt le précédent."
          onClose={() => setOpen(false)}
          width={600}
          footer={
            <>
              <Button onClick={() => setOpen(false)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="primary" onClick={() => void submit()} busy={busy}>
                Soumettre la proposition
              </Button>
            </>
          }
        >
          <ApprovalNotice />
          <div className="grid grid-2">
            <SelectField label="Marché" value={form.marketId} onChange={(e) => setForm({ ...form, marketId: e.target.value })} hint="Vide = global, tous marchés.">
              <option value="">Global (tous marchés)</option>
              {(markets.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Type de frais" value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value as FeeType })} required>
              {options('fee', FEE_TYPES).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </SelectField>
            <SelectField label="Mode" value={form.isPercentage ? '1' : '0'} onChange={(e) => setForm({ ...form, isPercentage: e.target.value === '1' })} required>
              <option value="1">Pourcentage</option>
              <option value="0">Montant fixe</option>
            </SelectField>
            <TextField label={form.isPercentage ? 'Valeur (%)' : 'Valeur (montant)'} inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} error={errors.value} required />
            <TextField label="Montant minimum" inputMode="decimal" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} error={errors.minAmount} hint="Optionnel." />
            <TextField label="Montant maximum" inputMode="decimal" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} error={errors.maxAmount} hint="Optionnel." />
          </div>
          <TextField label="Libellé" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} error={errors.label} placeholder="Ex. Commission AlKÉ BVMAC" required />
          <TextAreaField label="Motif de la modification" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} error={errors.reason} required hint="Visible du valideur et tracé dans le journal d’audit." />
        </Modal>
      )}
    </div>
  );
}
