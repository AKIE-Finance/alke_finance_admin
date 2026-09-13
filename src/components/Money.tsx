import { formatMoney } from '../format';

interface Props {
  value: string | number | null | undefined;
  currency?: string;
  signed?: boolean;
}

export default function Money({ value, currency = 'XAF', signed = false }: Props) {
  const n = value === null || value === undefined ? NaN : Number(value);
  const tone = signed && Number.isFinite(n) ? (n < 0 ? 'neg' : n > 0 ? 'pos' : '') : '';
  return (
    <span className={`money ${tone}`.trim()}>
      {signed && Number.isFinite(n) && n > 0 ? '+' : ''}
      {formatMoney(value, currency)}
    </span>
  );
}
