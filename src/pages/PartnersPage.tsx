import { useState } from 'react';
import { api } from '../api';
import type { Partner } from '../api/types';
import { useAuth } from '../auth';
import Badge from '../components/Badge';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { SelectField, TextAreaField, TextField } from '../components/Field';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { useBusy, useLoad } from '../hooks';
import { label, options } from '../labels';

const COLUMNS: { title: string; statuses: string[] }[] = [
  { title: 'Prospects', statuses: ['PROSPECT'] },
  { title: 'Premiers échanges', statuses: ['CONTACTED', 'MEETING_SCHEDULED', 'IN_DISCUSSION'] },
  { title: 'Négociation', statuses: ['TERM_SHEET', 'SIGNED'] },
  { title: 'Actifs', statuses: ['ACTIVE'] },
];

const STATUS_OPTIONS = ['PROSPECT', 'CONTACTED', 'MEETING_SCHEDULED', 'IN_DISCUSSION', 'TERM_SHEET', 'SIGNED', 'ACTIVE', 'DECLINED'];
const TIER_OPTIONS = ['TIER0_SIMULATED', 'TIER1_FILE', 'TIER2_BACKOFFICE_LINK', 'TIER3_API'];
const TYPE_OPTIONS: Partner['type'][] = ['SDB', 'SGI', 'BROKER'];

interface PartnerForm {
  marketId: string;
  name: string;
  code: string;
  type: Partner['type'];
  agreementStatus: string;
  integrationTier: string;
  aelpParticipant: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  agreementNumber: string;
  notes: string;
}

type Errors = Record<string, string>;

const EMPTY_FORM: PartnerForm = {
  marketId: '',
  name: '',
  code: '',
  type: 'SDB',
  agreementStatus: 'PROSPECT',
  integrationTier: 'TIER0_SIMULATED',
  aelpParticipant: false,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  agreementNumber: '',
  notes: '',
};

function toForm(p: Partner): PartnerForm {
  return {
    marketId: p.marketId,
    name: p.name,
    code: p.code ?? '',
    type: p.type,
    agreementStatus: p.agreementStatus,
    integrationTier: p.integrationTier,
    aelpParticipant: p.aelpParticipant,
    contactName: p.contactName ?? '',
    contactEmail: p.contactEmail ?? '',
    contactPhone: p.contactPhone ?? '',
    agreementNumber: p.agreementNumber ?? '',
    notes: p.notes ?? '',
  };
}

const opt = (s: string) => s.trim() || null;

export default function PartnersPage() {
  const { can } = useAuth();
  const manage = can('partners.manage');
  const { data: partners, loading, reload } = useLoad(() => api.partners.list(), []);
  const markets = useLoad(() => api.markets.list(), []);
  const { busy, run } = useBusy();

  const [editor, setEditor] = useState<{ mode: 'create' } | { mode: 'edit'; partner: Partner } | null>(null);
  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});

  const openEdit = (p: Partner) => {
    setForm(toForm(p));
    setErrors({});
    setEditor({ mode: 'edit', partner: p });
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, marketId: markets.data?.[0]?.id ?? '' });
    setErrors({});
    setEditor({ mode: 'create' });
  };

  const save = async () => {
    if (!editor) return;
    const e: Errors = {};
    if (!form.name.trim()) e.name = 'Le nom du partenaire est obligatoire.';
    if (editor.mode === 'create' && !form.marketId) e.marketId = 'Le marché est obligatoire.';
    if (form.contactEmail.trim() && !/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) e.contactEmail = 'Adresse e-mail invalide.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const body: Partial<Partner> = {
      name: form.name.trim(),
      code: opt(form.code),
      type: form.type,
      agreementStatus: form.agreementStatus,
      integrationTier: form.integrationTier,
      aelpParticipant: form.aelpParticipant,
      contactName: opt(form.contactName),
      contactEmail: opt(form.contactEmail),
      contactPhone: opt(form.contactPhone),
      agreementNumber: opt(form.agreementNumber),
      notes: opt(form.notes),
    };
    const res = await run(() => (editor.mode === 'edit' ? api.partners.update(editor.partner.id, body) : api.partners.create({ ...body, marketId: form.marketId })), editor.mode === 'edit' ? 'Partenaire mis à jour.' : 'Partenaire créé.');
    if (res !== undefined) {
      setEditor(null);
      reload();
    }
  };

  const list = partners ?? [];
  const declined = list.filter((p) => p.agreementStatus === 'DECLINED');

  return (
    <div>
      <PageHeader
        title="Partenaires boursiers"
        subtitle="Suivez la relation avec chaque société de bourse ou de gestion, du premier contact jusqu’à l’activation qui permet de lui envoyer des lots."
        breadcrumb={[{ label: 'Marchés' }, { label: 'Partenaires' }]}
        actions={
          manage ? (
            <Button variant="primary" onClick={openCreate} disabled={!markets.data?.length}>
              Nouveau partenaire
            </Button>
          ) : undefined
        }
      />

      {loading && list.length === 0 && (
        <div className="pipeline-board" aria-busy="true" aria-label="Chargement des partenaires">
          {COLUMNS.map((col) => (
            <div className="pipeline-col" key={col.title}>
              <h4>{col.title}</h4>
              <div className="pipeline-card">
                <span className="skeleton" />
                <br />
                <span className="skeleton" style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className="card">
          <EmptyState
            kind="files"
            title="Aucun partenaire enregistré"
            hint="Ajoutez les sociétés de bourse et de gestion avec lesquelles AlKÉ est en discussion ; un partenaire actif peut recevoir des lots d’ordres."
            action={
              manage ? (
                <Button variant="primary" onClick={openCreate} disabled={!markets.data?.length}>
                  Nouveau partenaire
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {list.length > 0 && (
        <div className="pipeline-board">
          {COLUMNS.map((col) => {
            const items = list.filter((p) => col.statuses.includes(p.agreementStatus));
            return (
              <div className="pipeline-col" key={col.title}>
                <h4>
                  <span>{col.title}</span>
                  <span className="num">{items.length}</span>
                </h4>
                {items.map((p) => (
                  <div
                    className="pipeline-card"
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openEdit(p);
                      }
                    }}
                  >
                    <div className="name">{p.name}</div>
                    <div className="meta">
                      {p.market?.code} · {p.type}
                      {p.aelpParticipant ? ' · AELP' : ''}
                      {p.code ? ` · ${p.code}` : ''}
                    </div>
                    <div className="row">
                      <Badge kind="partnerAgreement" value={p.agreementStatus} />
                      <Badge kind="integrationTier" value={p.integrationTier} />
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="pipeline-empty">Aucun partenaire à cette étape</div>}
              </div>
            );
          })}
        </div>
      )}

      {declined.length > 0 && (
        <section className="section" aria-labelledby="declined-title">
          <div className="section-head">
            <h2 id="declined-title" className="section-title">
              Écartés <span className="section-count">{declined.length}</span>
            </h2>
          </div>
          <div className="card">
            <ul className="plain-list">
              {declined.map((p) => (
                <li key={p.id} className="row">
                  <Button size="sm" onClick={() => openEdit(p)}>
                    {p.name}
                  </Button>
                  <span className="muted small">
                    {p.market?.code} · {label('partnerType', p.type)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {editor && (
        <Modal
          title={editor.mode === 'edit' ? editor.partner.name : 'Nouveau partenaire'}
          description={editor.mode === 'edit' ? `${editor.partner.market?.code} · ${label('partnerType', editor.partner.type)}` : undefined}
          onClose={() => setEditor(null)}
          width={640}
          footer={
            <>
              <Button onClick={() => setEditor(null)} disabled={busy}>
                {manage ? 'Annuler' : 'Fermer'}
              </Button>
              {manage && (
                <Button variant="primary" onClick={() => void save()} busy={busy}>
                  Enregistrer
                </Button>
              )}
            </>
          }
        >
          <fieldset disabled={!manage}>
            <div className="grid grid-2">
              <SelectField label="Marché" value={form.marketId} onChange={(e) => setForm({ ...form, marketId: e.target.value })} disabled={editor.mode === 'edit'} error={errors.marketId} required>
                <option value="">— Choisir —</option>
                {(markets.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Partner['type'] })} required>
                {options('partnerType', TYPE_OPTIONS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
              <TextField label="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required autoFocus />
              <TextField label="Code (fichiers SDB)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} hint="Identifiant court utilisé dans les noms de fichiers." />
              <SelectField label="Statut de la démarche" value={form.agreementStatus} onChange={(e) => setForm({ ...form, agreementStatus: e.target.value })} required>
                {options('partnerAgreement', STATUS_OPTIONS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Palier d’intégration technique" value={form.integrationTier} onChange={(e) => setForm({ ...form, integrationTier: e.target.value })} required>
                {options('integrationTier', TIER_OPTIONS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
              <TextField label="N° d’agrément" value={form.agreementNumber} onChange={(e) => setForm({ ...form, agreementNumber: e.target.value })} hint="Si connu." />
              <SelectField label="Participant AELP (BRVM)" value={form.aelpParticipant ? '1' : '0'} onChange={(e) => setForm({ ...form, aelpParticipant: e.target.value === '1' })}>
                <option value="0">Non</option>
                <option value="1">Oui</option>
              </SelectField>
              <TextField label="Contact — nom" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              <TextField label="Contact — e-mail" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} error={errors.contactEmail} />
              <TextField label="Contact — téléphone" type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
            <TextAreaField label="Notes / compte-rendu de rendez-vous" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </fieldset>
        </Modal>
      )}
    </div>
  );
}
