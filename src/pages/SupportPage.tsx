import { useEffect, useState } from 'react';
import { api } from '../api';
import Badge from '../components/Badge';

interface Message { id: string; authorType: string; body: string; createdAt: string; }
interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  user: { fullName: string; email: string };
  messages: Message[];
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [open, setOpen] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get<Ticket[]>('/admin/support/tickets').then(setTickets);
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!open || !reply.trim()) return;
    setBusy(true);
    try {
      await api.post(`/admin/support/tickets/${open.id}/messages`, { body: reply });
      await api.patch(`/admin/support/tickets/${open.id}`, { status: 'IN_PROGRESS' });
      setReply('');
      const updated = await api.get<Ticket[]>('/admin/support/tickets');
      setTickets(updated);
      setOpen(updated.find((t) => t.id === open.id) ?? null);
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!open) return;
    await api.patch(`/admin/support/tickets/${open.id}`, { status: 'RESOLVED' });
    setOpen(null);
    load();
  };

  return (
    <div>
      <h1 className="page-title">Support client</h1>
      <p className="page-subtitle">Module 8 — suivi des tickets et réclamations.</p>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        <div className="card">
          <table>
            <thead><tr><th>Sujet</th><th>Client</th><th>Statut</th></tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(t)}>
                  <td>{t.subject}</td>
                  <td>{t.user.fullName}</td>
                  <td><Badge value={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          {!open ? (
            <div className="empty-state">Sélectionnez un ticket.</div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{open.subject}</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{open.user.fullName} · {open.category}</div>
                </div>
                <Badge value={open.status} />
              </div>
              <div style={{ margin: '16px 0', maxHeight: 260, overflowY: 'auto' }}>
                {open.messages.map((m) => (
                  <div key={m.id} style={{ marginBottom: 10, textAlign: m.authorType === 'AGENT' ? 'right' : 'left' }}>
                    <div style={{
                      display: 'inline-block', padding: '8px 12px', borderRadius: 10, fontSize: 13,
                      background: m.authorType === 'AGENT' ? 'var(--alke-blue)' : '#eef0f5',
                      color: m.authorType === 'AGENT' ? '#fff' : 'var(--text)',
                    }}>
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
              <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Répondre au client..." />
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="btn btn-primary" disabled={busy} onClick={send}>Envoyer</button>
                <button className="btn btn-outline" onClick={close}>Marquer résolu</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
