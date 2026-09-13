import { formatDate, formatDateTime } from '../format';

interface Props {
  value: string | null | undefined;
  dateOnly?: boolean;
}

export default function DateTime({ value, dateOnly = false }: Props) {
  if (!value) return <span className="muted">—</span>;
  return (
    <time dateTime={value} title={new Date(value).toISOString()}>
      {dateOnly ? formatDate(value) : formatDateTime(value)}
    </time>
  );
}
