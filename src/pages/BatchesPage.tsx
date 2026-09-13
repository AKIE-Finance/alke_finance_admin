import { useMemo, useState, type ChangeEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { Batch, BatchState, Order } from '../api/types';
import { useAuth } from '../auth';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Copyable from '../components/Copyable';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import Drawer from '../components/Drawer';
import EmptyState from '../components/EmptyState';
import { FileField, SelectField, TextAreaField } from '../components/Field';
import FilterBar, { FilterSelect } from '../components/FilterBar';
import { useFilters } from '../useFilters';
import Modal from '../components/Modal';
import Money from '../components/Money';
import PageHeader from '../components/PageHeader';
import { DefinitionGrid } from '../components/Section';
import { formatNumber } from '../format';
import { useBusy, useLoad } from '../hooks';
import { label, options } from '../labels';
import { toast } from '../toast';

const BATCH_STATES: BatchState[] = ['BUILT', 'SENT', 'ACKED', 'PROCESSED', 'FAILED'];

type ModalKind = 'build' | 'wdr' | 'csh' | 'ack' | 'exe';

const IMPORT_LABELS: Record<'ack' | 'exe' | 'csh', { title: string; hint: string }> = {
  ack: { title: 'Importer un accusé de réception (ACK)', hint: 'Fichier ACK renvoyé par la SDB pour ce lot.' },
  exe: { title: 'Importer les exécutions (EXE)', hint: 'Fichier EXE de la SDB : met à jour les ordres du lot.' },
  csh: { title: 'Importer un relevé espèces (CSH)', hint: 'Relevé du compte espèces clientèle chez le partenaire, utilisé pour le rapprochement.' },
};

/** Zone de saisie du contenu d'un fichier partenaire : collage direct ou lecture d'un fichier local. */
function ImportFields({ content, onChange, error }: { content: string; onChange: (v: string) => void; error?: string | null }) {
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onChange(await file.text());
      toast.info(`Fichier « ${file.name} » chargé (${formatNumber(file.size)} octets).`);
    } catch {
      toast.error('Lecture du fichier impossible.');
    }
  };
  return (
    <>
      <FileField label="Fichier (texte / CSV)" accept=".csv,.txt,.dat,text/*" onChange={(e) => void onFile(e)} hint="Le contenu est lu localement puis affiché ci-dessous pour vérification." />
      <TextAreaField label="Contenu" rows={8} className="mono" value={content} onChange={(e) => onChange(e.target.value)} placeholder="Collez ici le contenu du fichier…" error={error} required />
    </>
  );
}

export default function BatchesPage() {
  const { can } = useAuth();
  const manage = can('batches.manage');
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('id') ?? '';
  const select = (id: string | null) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (id) p.set('id', id);
      else p.delete('id');
      return p;
    });

  const f = useFilters({ marketId: '', state: '' });
  const { marketId, state } = f.values;
  const markets = useLoad(() => api.markets.list(), []);
  const partners = useLoad(() => (manage ? api.partners.list() : Promise.resolve([])), [manage]);
  const batches = useLoad(() => api.batches.list({ marketId, state }), [marketId, state]);
  const detail = useLoad(() => (selectedId ? api.batches.get(selectedId) : Promise.resolve(undefined)), [selectedId]);
  const { busy, run } = useBusy();

  const [modal, setModal] = useState<ModalKind | null>(null);
  const [buildForm, setBuildForm] = useState({ marketId: '', partnerId: '' });
  const [cshPartnerId, setCshPartnerId] = useState('');
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const activePartners = useMemo(() => (partners.data ?? []).filter((p) => p.agreementStatus === 'ACTIVE'), [partners.data]);
  const buildPartners = activePartners.filter((p) => !buildForm.marketId || p.marketId === buildForm.marketId);

  const refresh = () => {
    batches.reload();
    if (selectedId) detail.reload();
  };

  const openBuild = () => {
    const m = marketId || markets.data?.[0]?.id || '';
    const first = activePartners.find((p) => p.marketId === m);
    setBuildForm({ marketId: m, partnerId: first?.id ?? '' });
    setFormError(null);
    setModal('build');
  };

  const openWdr = () => {
    setBuildForm({ marketId: '', partnerId: activePartners[0]?.id ?? '' });
    setFormError(null);
    setModal('wdr');
  };

  const openImport = (kind: 'ack' | 'exe' | 'csh') => {
    setContent('');
    setFormError(null);
    if (kind === 'csh') setCshPartnerId(activePartners[0]?.id ?? '');
    setModal(kind);
  };

  const submitBuild = async () => {
    if (!buildForm.marketId || !buildForm.partnerId) {
      setFormError('Choisissez un marché et un partenaire actif.');
      return;
    }
    const res = await run(() => api.batches.build(buildForm), 'Lot ORD construit.');
    if (res !== undefined) {
      setModal(null);
      batches.reload();
      select(res.id);
    }
  };

  const submitWdr = async () => {
    if (!buildForm.partnerId) {
      setFormError('Choisissez un partenaire actif.');
      return;
    }
    const res = await run(() => api.batches.buildWdr({ partnerId: buildForm.partnerId }), 'Lot WDR (retraits) construit.');
    if (res !== undefined) {
      setModal(null);
      batches.reload();
      select(res.id);
    }
  };

  const submitImport = async () => {
    if (!modal || modal === 'build' || modal === 'wdr') return;
    if (!content.trim()) {
      setFormError('Le contenu du fichier est vide.');
      return;
    }
    if (modal === 'csh') {
      if (!cshPartnerId) {
        setFormError('Choisissez un partenaire.');
        return;
      }
      const res = await run(() => api.batches.importCsh(cshPartnerId, content));
      if (res !== undefined) {
        const n = res?.imported ?? res?.items?.length;
        toast.success(n !== undefined ? `Relevé CSH importé : ${formatNumber(n)} ligne(s).` : 'Relevé CSH importé.');
        setModal(null);
      }
      return;
    }
    if (!selectedId) return;
    const res = await run(() => (modal === 'ack' ? api.batches.importAck(selectedId, content) : api.batches.importExe(selectedId, content)), modal === 'ack' ? 'ACK importé : lot accusé.' : 'EXE importé : ordres mis à jour.');
    if (res !== undefined) {
      setModal(null);
      refresh();
    }
  };

  const markSent = async (b: Batch) => {
    const res = await run(() => api.batches.markSent(b.id), 'Lot marqué comme envoyé.');
    if (res !== undefined) refresh();
  };

  const download = (b: Batch) => void run(() => api.batches.downloadFile(b.id, b.fileName), `Fichier ${b.fileName} téléchargé.`);

  const b = detail.data;
  const marketOptions = (markets.data ?? []).map((m) => ({ value: m.id, label: m.code }));
  const noActivePartner = manage && !partners.loading && activePartners.length === 0;

  return (
    <div>
      <PageHeader
        title="Lots SDB"
        subtitle="Constituez les fichiers d’ordres et de retraits à envoyer au partenaire boursier, puis importez ses retours (ACK, EXE, relevés)."
        breadcrumb={[{ label: 'Marchés' }, { label: 'Lots SDB' }]}
        actions={
          manage ? (
            <>
              <Button onClick={() => openImport('csh')} disabled={activePartners.length === 0}>
                Importer un relevé CSH
              </Button>
              <Button onClick={openWdr} disabled={activePartners.length === 0}>
                Construire un lot WDR
              </Button>
              <Button variant="primary" onClick={openBuild} disabled={activePartners.length === 0}>
                Construire un lot ORD
              </Button>
            </>
          ) : undefined
        }
      />

      {noActivePartner && (
        <div className="notice notice-warning">
          Aucun partenaire actif : activez un partenaire dans la page <Link to="/partners">Partenaires</Link> pour construire des lots.
        </div>
      )}

      <FilterBar active={f.active} onReset={f.reset} onRefresh={batches.reload} refreshing={batches.loading}>
        <FilterSelect label="Marché" value={marketId} onChange={(v) => f.set('marketId', v)} allLabel="Tous les marchés" options={marketOptions} />
        <FilterSelect label="État" value={state} onChange={(v) => f.set('state', v)} allLabel="Tous les états" options={options('batch', BATCH_STATES)} />
      </FilterBar>

      <div className="card card-table">
        <DataTable<Batch>
          caption="Lots"
          loading={batches.loading}
          rows={batches.data}
          rowKey={(x) => x.id}
          onRowClick={(x) => select(x.id)}
          empty={{
            kind: 'files',
            title: f.active ? 'Aucun lot pour ces filtres' : 'Aucun lot construit',
            hint: f.active ? 'Élargissez les critères ou réinitialisez les filtres.' : 'Les ordres en attente du marché sont regroupés dans un fichier ORD au cut-off de 09:30.',
            action:
              manage && !f.active ? (
                <Button variant="primary" onClick={openBuild} disabled={activePartners.length === 0}>
                  Construire un lot
                </Button>
              ) : undefined,
          }}
          columns={[
            { key: 'seq', header: 'N°', align: 'right', numeric: true, render: (x) => <strong>{x.sequence}</strong> },
            { key: 'type', header: 'Type', render: (x) => <Badge kind="batchType" value={x.type ?? 'ORD'} /> },
            { key: 'market', header: 'Marché', render: (x) => x.market?.code },
            { key: 'partner', header: 'Partenaire', priority: 'secondary', render: (x) => `${x.partner?.name ?? '—'}${x.partner?.code ? ` (${x.partner.code})` : ''}` },
            { key: 'file', header: 'Fichier', priority: 'detail', render: (x) => <Copyable value={x.fileName} short={0} what="le nom du fichier" /> },
            { key: 'orders', header: 'Ordres', align: 'right', numeric: true, render: (x) => formatNumber(x.orderCount) },
            { key: 'state', header: 'État', render: (x) => <Badge kind="batch" value={x.state} /> },
            { key: 'cutoff', header: 'Cut-off', nowrap: true, render: (x) => <DateTime value={x.cutoffAt} /> },
            { key: 'sent', header: 'Envoyé', priority: 'detail', nowrap: true, render: (x) => <DateTime value={x.sentAt} /> },
            { key: 'ack', header: 'ACK', priority: 'detail', nowrap: true, render: (x) => <DateTime value={x.ackAt} /> },
          ]}
        />
      </div>

      {selectedId && (
        <Drawer title={b ? `Lot ${label('batchType', b.type ?? 'ORD')} n°${b.sequence} — ${b.market?.code ?? ''}` : 'Lot'} onClose={() => select(null)}>
          {detail.loading && !b && (
            <div aria-busy="true" className="stack">
              <span className="skeleton skeleton-block" />
              <span className="skeleton skeleton-block" style={{ width: '70%' }} />
              <span className="skeleton skeleton-block" style={{ width: '50%' }} />
            </div>
          )}
          {!detail.loading && !b && <EmptyState kind="files" title="Lot introuvable" hint="Il a peut-être été supprimé ou l’identifiant est incorrect." />}
          {b && (
            <>
              <DefinitionGrid
                items={[
                  {
                    label: 'Partenaire',
                    value: (
                      <>
                        {b.partner?.name}
                        {b.partner?.code && <span className="sub">Code {b.partner.code}</span>}
                      </>
                    ),
                  },
                  { label: 'État', value: <Badge kind="batch" value={b.state} /> },
                  {
                    label: 'Fichier',
                    value: (
                      <>
                        <Copyable value={b.fileName} short={0} what="le nom du fichier" />
                        {b.fileHash && (
                          <span className="sub">
                            SHA-256 <Copyable value={b.fileHash} short={16} what="l’empreinte" />
                          </span>
                        )}
                      </>
                    ),
                  },
                  { label: 'Cut-off', value: <DateTime value={b.cutoffAt} /> },
                  { label: 'Envoyé', value: <DateTime value={b.sentAt} /> },
                  { label: 'Accusé (ACK)', value: <DateTime value={b.ackAt} /> },
                  { label: 'Traité', value: <DateTime value={b.processedAt} /> },
                ]}
              />

              <div className="actions">
                <Button onClick={() => download(b)} busy={busy}>
                  Télécharger le fichier
                </Button>
                {manage && b.state === 'BUILT' && (
                  <Button variant="primary" onClick={() => void markSent(b)} busy={busy}>
                    Marquer envoyé
                  </Button>
                )}
                {manage && b.state === 'SENT' && (
                  <Button variant="primary" onClick={() => openImport('ack')} disabled={busy}>
                    Importer ACK
                  </Button>
                )}
                {manage && (b.state === 'ACKED' || b.state === 'SENT') && (b.type ?? 'ORD') === 'ORD' && (
                  <Button variant="green" onClick={() => openImport('exe')} disabled={busy}>
                    Importer EXE
                  </Button>
                )}
                <Link className="btn btn-outline" to={`/orders?batchId=${b.id}`}>
                  Voir dans Ordres
                </Link>
              </div>

              <section className="section" aria-label="Ordres du lot">
                <div className="section-head">
                  <h2 className="section-title">
                    Ordres du lot <span className="section-count">{formatNumber(b.orders?.length ?? b.orderCount)}</span>
                  </h2>
                </div>
                <DataTable<Order>
                  caption="Ordres du lot"
                  rows={b.orders ?? []}
                  rowKey={(o) => o.id}
                  hideFooter
                  empty={{ kind: 'orders', title: 'Aucun ordre dans ce lot' }}
                  columns={[
                    { key: 'user', header: 'Client', render: (o) => o.user?.fullName },
                    { key: 'instr', header: 'Valeur', render: (o) => <strong>{o.instrument?.symbol}</strong> },
                    { key: 'side', header: 'Sens', render: (o) => <Badge kind="orderSide" value={o.side} /> },
                    { key: 'qty', header: 'Qté', align: 'right', numeric: true, render: (o) => formatNumber(o.quantity) },
                    { key: 'filled', header: 'Exécuté', align: 'right', numeric: true, priority: 'secondary', render: (o) => formatNumber(o.filledQuantity) },
                    { key: 'price', header: 'Prix', align: 'right', numeric: true, priority: 'secondary', render: (o) => <Money value={o.avgExecutedPrice ?? o.estimatedPrice} currency={o.instrument?.currency ?? 'XAF'} /> },
                    { key: 'status', header: 'Statut', render: (o) => <Badge kind="order" value={o.status} /> },
                    { key: 'sdb', header: 'Réf. SDB', priority: 'detail', render: (o) => (o.sdbRef ? <span className="mono">{o.sdbRef}</span> : <span className="muted">—</span>) },
                  ]}
                />
              </section>
            </>
          )}
        </Drawer>
      )}

      {modal === 'build' && (
        <Modal
          title="Construire un lot ORD"
          description="Regroupe les ordres en attente du marché dans un fichier ORD destiné au partenaire actif."
          onClose={() => setModal(null)}
          footer={
            <>
              <Button onClick={() => setModal(null)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="primary" onClick={() => void submitBuild()} busy={busy} disabled={!buildForm.partnerId}>
                Construire
              </Button>
            </>
          }
        >
          {formError && <div className="notice notice-danger">{formError}</div>}
          <SelectField
            label="Marché"
            required
            value={buildForm.marketId}
            onChange={(e) => {
              const m = e.target.value;
              const first = activePartners.find((p) => p.marketId === m);
              setBuildForm({ marketId: m, partnerId: first?.id ?? '' });
            }}
          >
            <option value="">— Choisir —</option>
            {(markets.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Partenaire actif"
            required
            value={buildForm.partnerId}
            onChange={(e) => setBuildForm({ ...buildForm, partnerId: e.target.value })}
            error={buildForm.marketId && buildPartners.length === 0 ? 'Aucun partenaire actif sur ce marché.' : undefined}
          >
            <option value="">— Choisir —</option>
            {buildPartners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({label('partnerType', p.type)})
              </option>
            ))}
          </SelectField>
        </Modal>
      )}

      {modal === 'wdr' && (
        <Modal
          title="Construire un lot WDR (retraits)"
          description="Regroupe les demandes de retrait en attente vers le compte espèces du partenaire."
          onClose={() => setModal(null)}
          footer={
            <>
              <Button onClick={() => setModal(null)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="primary" onClick={() => void submitWdr()} busy={busy} disabled={!buildForm.partnerId}>
                Construire
              </Button>
            </>
          }
        >
          {formError && <div className="notice notice-danger">{formError}</div>}
          <SelectField label="Partenaire actif" required value={buildForm.partnerId} onChange={(e) => setBuildForm({ ...buildForm, partnerId: e.target.value })}>
            <option value="">— Choisir —</option>
            {activePartners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.market?.code}
              </option>
            ))}
          </SelectField>
        </Modal>
      )}

      {(modal === 'ack' || modal === 'exe' || modal === 'csh') && (
        <Modal
          title={IMPORT_LABELS[modal].title}
          description={IMPORT_LABELS[modal].hint}
          onClose={() => setModal(null)}
          width={640}
          footer={
            <>
              <Button onClick={() => setModal(null)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="primary" onClick={() => void submitImport()} busy={busy} disabled={!content.trim()}>
                Importer
              </Button>
            </>
          }
        >
          {modal === 'csh' && (
            <SelectField label="Partenaire" required value={cshPartnerId} onChange={(e) => setCshPartnerId(e.target.value)} error={formError && !cshPartnerId ? formError : undefined}>
              <option value="">— Choisir —</option>
              {activePartners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.market?.code}
                </option>
              ))}
            </SelectField>
          )}
          <ImportFields
            content={content}
            onChange={(v) => {
              setContent(v);
              setFormError(null);
            }}
            error={formError && !content.trim() ? formError : undefined}
          />
        </Modal>
      )}
    </div>
  );
}
