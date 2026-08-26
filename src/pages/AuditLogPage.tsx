import { useEffect, useState } from 'react';
import { api } from '../api';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorRole: string | null;
  actor: { fullName: string; email: string } | null;
  createdAt: string;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    api.get<AuditEntry[]>('/admin/audit-log').then(setEntries);
  }, []);

  return (
    <div>
      <h1 className="page-title">Journal d’audit</h1>
      <p className="page-subtitle">Module 9.4 — traçabilité complète et non modifiable des opérations sensibles.</p>

      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Action</th><th>Entité</th><th>Acteur</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.createdAt).toLocaleString('fr-FR')}</td>
                <td style={{ fontWeight: 600 }}>{e.action}</td>
                <td>{e.entityType} · {e.entityId.slice(0, 8)}…</td>
                <td>{e.actor?.fullName ?? '—'} ({e.actorRole ?? 'système'})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
