// Formatage fr-FR partagé (montants, dates, nombres).

const ZERO_DECIMAL = new Set(['XAF', 'XOF', 'GNF', 'RWF', 'UGX', 'JPY']);

const formatterCache = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string): Intl.NumberFormat {
  const key = currency.toUpperCase();
  let f = formatterCache.get(key);
  if (!f) {
    const digits = ZERO_DECIMAL.has(key) ? 0 : 2;
    try {
      f = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: key,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    } catch {
      f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    }
    formatterCache.set(key, f);
  }
  return f;
}

export function formatMoney(value: string | number | null | undefined, currency = 'XAF'): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  const f = moneyFormatter(currency);
  const out = f.format(n);
  // Intl sans style monétaire (devise inconnue) : on ajoute le code.
  return f.resolvedOptions().style === 'currency' ? out : `${out} ${currency}`;
}

const numberFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 });

export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? numberFormatter.format(n) : String(value);
}

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : dateTimeFormatter.format(d);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : dateFormatter.format(d);
}

export function shortId(id: string | null | undefined, len = 8): string {
  return id ? `${id.slice(0, len)}…` : '—';
}

/** Date du jour au format YYYY-MM-DD (fuseau local). */
export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentMonth(): string {
  return todayIso().slice(0, 7);
}

/** Convertit une saisie utilisateur (virgule décimale, espaces) en nombre ; NaN si vide/invalide. */
export function parseNumber(input: string | number | null | undefined): number {
  if (typeof input === 'number') return input;
  if (input === null || input === undefined) return NaN;
  const s = String(input).trim().replace(/\s/g, '').replace(',', '.');
  return s === '' ? NaN : Number(s);
}
