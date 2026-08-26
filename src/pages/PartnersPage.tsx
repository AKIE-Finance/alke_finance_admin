import { useEffect, useState } from 'react';
import { api } from '../api';
import Badge from '../components/Badge';

interface Partner {
  id: string;
  name: string;
  type: string;
  agreementStatus: string;
  integrationTier: string;
  aelpParticipant: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  agreementNumber: string | null;
  market: { code: string };
}

const COLUMNS: { title: string; statuses: string[] }[] = [
  { title: 'Prospects', statuses: ['PROSPECT'] },
  { title: 'Premiers échanges', statuses: ['CONTACTED', 'MEETING_SCHEDULED', 'IN_DISCUSSION'] },
  { title: 'Négociation', statuses: ['TERM_SHEET', 'SIGNED'] },
  { title: 'Actif', statuses: ['ACTIVE'] },
];

const STATUS_OPTIONS = ['PROSPECT', 'CONTACTED', 'MEETING_SCHEDULED', 'IN_DISCUSSION', 'TERM_SHEET', 'SIGNED', 'ACTIVE', 'DECLINED'];
const TIER_OPTIONS = ['TIER0_SIMULATED', 'TIER1_FILE', 'TIER2_BACKOFFICE_LINK', 'TIER3_API'];

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [form, setForm] = useState<Partial<Partner>>({});
  const [busy, setBusy] = useState(false);

  const load = () => api.get<Partner[]>('/partners').then(setPartners);
  useEffect(() => { load(); }, []);

  const openDetail = (p: Partner) => {
    setSelected(p);
    setForm({ ...p });
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.patch(`/partners/${selected.id}`, {
        agreementStatus: form.agreementStatus,
        integrationTier: form.integrationTier,
        aelpParticipant: form.aelpParticipant,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        agreementNumber: form.agreementNumber,
        notes: form.notes,
      });
      setSelected(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const declined = partners.filter((p) => p.agreementStatus === 'DECLINED');

  return (
    <div>
      <h1 className="page-title">Partenaires boursiers (SDB / SGI)</h1>
      <p className="page-subtitle">
        Pipeline de démarchage — Guides ALKE-BOURSE-2026-001 (BVMAC) et -002 (BRVM, AELP). Faire passer un
        partenaire en <strong>Actif</strong> bascule automatiquement le marché correspondant en mode réel
        pour les nouveaux ordres.
      </p>

      <div className="pipeline-board">
        {COLUMNS.map((col) => (
          <div className="pipeline-col" key={col.title}>
            <h4>{col.title} ({partners.filter((p) => col.statuses.includes(p.agreementStatus)).length})</h4>
            {partners
              .filter((p) => col.statuses.includes(p.agreementStatus))
              .map((p) => (
                <div className="pipeline-card" key={p.id} onClick={() => openDetail(p)}>
                  <div className="name">{p.name}</div>
                  <div className="meta">{p.market.code} · {p.type}{p.aelpParticipant ? ' · AELP' : ''}</div>
                  <div style={{ marginTop: 6 }}><Badge value={p.agreementStatus} /></div>
                </div>
              ))}
          </div>
        ))}
      </div>

      {declined.length > 0 && (
        <>
          <div className="section-title">Écartés</div>
          <div className="card">
            {declined.map((p) => (
              <div key={p.id} style={{ padding: '6px 0', cursor: 'pointer' }} onClick={() => openDetail(p)}>
                {p.name} — {p.market.code}
              </div>
            ))}
          </div>
        </>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selected.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{selected.market.code} · {selected.type}</p>

            <div className="form-row">
              <label>Statut de la démarche</label>
              <select value={form.agreementStatus} onChange={(e) => setForm({ ...form, agreementStatus: e.target.value })}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Palier d’intégration technique</label>
              <select value={form.integrationTier} onChange={(e) => setForm({ ...form, integrationTier: e.target.value })}>
                {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>N° d’agrément (si connu)</label>
              <input value={form.agreementNumber ?? ''} onChange={(e) => setForm({ ...form, agreementNumber: e.target.value })} />
            </div>
            <div className="grid grid-2">
              <div className="form-row">
                <label>Contact — nom</label>
                <input value={form.contactName ?? ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Contact — e-mail</label>
                <input value={form.contactEmail ?? ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label>Contact — téléphone</label>
              <input value={form.contactPhone ?? ''} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Notes / compte-rendu de rendez-vous</label>
              <textarea rows={4} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn-primary" disabled={busy} onClick={save}>Enregistrer</button>
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
