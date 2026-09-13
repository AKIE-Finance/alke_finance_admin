interface Props {
  value: unknown;
  maxHeight?: number;
}

export default function JsonView({ value, maxHeight = 260 }: Props) {
  if (value === null || value === undefined) return <span className="muted">—</span>;
  let text: string;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <pre className="json-view" style={{ maxHeight }}>
      {text}
    </pre>
  );
}
