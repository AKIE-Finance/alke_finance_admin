const COLOR_MAP: Record<string, string> = {
  VERIFIED: 'badge-green', ACTIVE: 'badge-green', EXECUTED: 'badge-green', SIGNED: 'badge-green', COMPLETED: 'badge-green', RESOLVED: 'badge-green',
  PENDING: 'badge-warning', IN_REVIEW: 'badge-warning', TRANSMITTED: 'badge-warning', PARTIALLY_EXECUTED: 'badge-warning', TERM_SHEET: 'badge-warning', OPEN: 'badge-warning', IN_DISCUSSION: 'badge-warning', MEETING_SCHEDULED: 'badge-warning', CONTACTED: 'badge-warning',
  REJECTED: 'badge-danger', DECLINED: 'badge-danger', CANCELLED: 'badge-danger', FAILED: 'badge-danger', CLOSED: 'badge-danger',
  NOT_STARTED: 'badge-gray', PROSPECT: 'badge-gray', SIMULATED_ONLY: 'badge-gray',
  LIVE: 'badge-blue', PARTNER_IN_PROGRESS: 'badge-blue',
};

export default function Badge({ value }: { value: string }) {
  const cls = COLOR_MAP[value] || 'badge-gray';
  return <span className={`badge ${cls}`}>{value.replace(/_/g, ' ')}</span>;
}
