import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { isApproval, type Balance, type BrokerAccount, type BrokerAccountState, type KycSubmission, type Order, type PendingApproval } from '../api/types';
import { useAuth } from '../auth';
import ApprovalNotice from '../components/ApprovalNotice';
import Badge from '../components/Badge';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import Copyable from '../components/Copyable';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import EmptyState from '../components/EmptyState';
import { SelectField, TextAreaField, TextField } from '../components/Field';
import Icon from '../components/icons';
import JsonView from '../components/JsonView';
import Modal from '../components/Modal';
import Money from '../components/Money';
import PageHeader from '../components/PageHeader';
import Section, { DefinitionGrid } from '../components/Section';
import { formatNumber } from '../format';
import { useBusy, useLoad } from '../hooks';
import { label, options } from '../labels';
import { toast } from '../toast';

const ACCOUNT_STATES: BrokerAccountState[] = ['OPEN', 'SUSPENDED'];

function DocLink({ href, label: text }: { href: string | null; label: string }) {
  if (!href) return <span className="muted">{text} : —</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="doc-link">
      {text} <Icon name="external" size={12} />
    </a>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement de la fiche">
      <div className="skeleton skeleton-block mb-3" style={{ width: 160, height: 14 }} />
      <div className="skeleton skeleton-block mb-4" style={{ width: 320, height: 26 }} />
      <div className="card">
        <div className="def-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="def-item">
              <span className="skeleton" style={{ width: '50%', height: 10 }} />
              <br />
              <span className="skeleton" style={{ width: '70%' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const { data: user, loading, reload } = useLoad(() => api.users.get(id), [id]);
  const { busy, run } = useBusy();

  const [blockDialog, setBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [approval, setApproval] = useState<PendingApproval | null>(null);
  const [editingAccount, setEditingAccount] = useState<BrokerAccount | null>(null);
  const [accountForm, setAccountForm] = useState({ externalAccountNo: '', state: 'OPEN' as BrokerAccountState });
  const [accountError, setAccountError] = useState<string | null>(null);

  if (loading && !user) return <DetailSkeleton />;
  if (!user) {
    return (
      <div>
        <PageHeader title="Utilisateur introuvable" breadcrumb={[{ label: 'Clients' }, { label: 'Utilisateurs', to: '/users' }, { label: 'Détail' }]} />
        <div className="card">
          <EmptyState
            kind="users"
            title="Aucun client ne porte cet identifiant"
            hint="Il a peut-être été supprimé, ou le lien est incomplet."
            action={
              <Link to="/users" className="btn btn-outline">
                Retour à la liste
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const toggleBlock = async () => {
    const res = await run(
      () =>
        api.users.block(user.id, {
          isBlocked: !user.isBlocked,
          blockedReason: !user.isBlocked ? blockReason.trim() || 'Blocage manuel back-office' : undefined,
        }),
      undefined,
    );
    if (res === undefined) return;
    setBlockDialog(false);
    setBlockReason('');
    if (isApproval(res)) {
      setApproval(res.approval);
      toast.success('Demande d’approbation créée : le déblocage sera appliqué après validation.');
    } else {
      toast.success(user.isBlocked ? 'Compte débloqué.' : 'Compte bloqué.');
    }
    reload();
  };

  const openAccountEditor = (a: BrokerAccount) => {
    setEditingAccount(a);
    setAccountError(null);
    setAccountForm({ externalAccountNo: a.externalAccountNo ?? '', state: a.state === 'SUSPENDED' ? 'SUSPENDED' : 'OPEN' });
  };

  const saveAccount = async () => {
    if (!editingAccount) return;
    if (!accountForm.externalAccountNo.trim()) {
      setAccountError('Le numéro de compte-titres est obligatoire.');
      return;
    }
    const res = await run(() => api.brokerAccounts.update(editingAccount.id, { externalAccountNo: accountForm.externalAccountNo.trim(), state: accountForm.state }), 'Compte-titres mis à jour.');
    if (res !== undefined) {
      setEditingAccount(null);
      reload();
    }
  };

  const latestKyc = user.kycSubmissions?.[0];
  const balances = user.balances ?? [];
  const kycSubs = user.kycSubmissions ?? [];
  const accounts = user.brokerAccounts ?? [];
  const orders = user.orders ?? [];
  const cases = user.complianceCases ?? [];

  return (
    <div>
      <PageHeader
        title={user.fullName}
        subtitle={
          <>
            {user.email} · {user.phone} · <Copyable value={user.id} what="l’identifiant client" />
          </>
        }
        breadcrumb={[{ label: 'Clients' }, { label: 'Utilisateurs', to: '/users' }, { label: user.fullName }]}
        actions={
          can('users.block') ? (
            <Button variant={user.isBlocked ? 'green' : 'danger'} onClick={() => setBlockDialog(true)} disabled={busy}>
              {user.isBlocked ? 'Débloquer le compte' : 'Bloquer le compte'}
            </Button>
          ) : undefined
        }
      />

      {approval && <ApprovalNotice approval={approval} message="Le déblocage a été soumis à validation à deux yeux." />}

      <div className="card">
        <DefinitionGrid
          items={[
            {
              label: 'Statut KYC',
              value: (
                <>
                  <Badge kind="kyc" value={user.kycStatus} />
                  {latestKyc?.decisionReason && <span className="sub">{latestKyc.decisionReason}</span>}
                </>
              ),
            },
            {
              label: 'Compte',
              value: (
                <>
                  <Badge kind="account" value={user.isBlocked ? 'BLOCKED' : 'ACTIVE'} />
                  {user.isBlocked && user.blockedReason && <span className="sub">{user.blockedReason}</span>}
                </>
              ),
            },
            { label: 'Rôle', value: label('role', user.role) },
            { label: 'Pays', value: <span title={user.country}>{label('country', user.country)}</span> },
            { label: 'Inscrit le', value: <DateTime value={user.createdAt} /> },
            { label: 'Dernière soumission KYC', value: latestKyc?.submittedAt ? <DateTime value={latestKyc.submittedAt} /> : <span className="muted">—</span> },
          ]}
        />
      </div>

      <Section title="Soldes" count={balances.length} emptyText="Aucun compte du grand livre ouvert pour ce client.">
        <DataTable<Balance>
          caption="Soldes du grand livre"
          rows={balances}
          rowKey={(b) => `${b.kind}-${b.currency}`}
          hideFooter
          columns={[
            { key: 'kind', header: 'Compte', render: (b) => <Badge kind="ledgerKind" value={b.kind} /> },
            { key: 'currency', header: 'Devise', render: (b) => b.currency },
            { key: 'balance', header: 'Solde', align: 'right', numeric: true, render: (b) => <Money value={b.balance} currency={b.currency} /> },
          ]}
        />
      </Section>

      <Section
        title="Historique KYC"
        count={kycSubs.length}
        emptyText="Aucune soumission KYC : le client n’a pas encore commencé la vérification d’identité."
        actions={latestKyc && latestKyc.status === 'MANUAL_REVIEW' && can('kyc.decide') ? <Link to="/kyc">Traiter dans la file KYC</Link> : undefined}
      >
        <DataTable<KycSubmission>
          caption="Soumissions KYC"
          rows={kycSubs}
          rowKey={(k) => k.id}
          hideFooter
          columns={[
            { key: 'date', header: 'Soumis le', nowrap: true, render: (k) => <DateTime value={k.submittedAt} /> },
            { key: 'status', header: 'Statut', render: (k) => <Badge kind="kyc" value={k.status} /> },
            { key: 'doc', header: 'Document', priority: 'secondary', render: (k) => `${k.documentType ?? '—'}${k.documentCountry ? ` (${label('country', k.documentCountry)})` : ''}` },
            { key: 'liveness', header: 'Vivacité', align: 'right', numeric: true, priority: 'detail', render: (k) => (k.livenessScore === null ? '—' : formatNumber(k.livenessScore)) },
            {
              key: 'files',
              header: 'Pièces',
              priority: 'secondary',
              render: (k) => (
                <div className="doc-links">
                  <DocLink href={k.documentFrontUrl} label="Recto" />
                  <DocLink href={k.documentBackUrl} label="Verso" />
                  <DocLink href={k.selfieUrl} label="Selfie" />
                </div>
              ),
            },
            { key: 'reason', header: 'Motif', priority: 'detail', render: (k) => k.decisionReason ?? k.rejectionReason ?? <span className="muted">—</span> },
          ]}
        />
        {latestKyc?.screeningResult && (
          <details className="mt-3">
            <summary>Résultat de screening (dernière soumission)</summary>
            <JsonView value={latestKyc.screeningResult} />
          </details>
        )}
      </Section>

      <Section title="Comptes-titres" count={accounts.length} emptyText="Aucun compte-titres demandé.">
        <DataTable<BrokerAccount>
          caption="Comptes-titres"
          rows={accounts}
          rowKey={(a) => a.id}
          hideFooter
          columns={[
            { key: 'partner', header: 'Partenaire', render: (a) => a.partner?.name ?? a.partnerId },
            { key: 'no', header: 'N° de compte', render: (a) => (a.externalAccountNo ? <span className="mono">{a.externalAccountNo}</span> : <span className="muted">non attribué</span>) },
            { key: 'state', header: 'État', render: (a) => <Badge kind="brokerAccount" value={a.state} /> },
            { key: 'opened', header: 'Ouvert le', priority: 'secondary', nowrap: true, render: (a) => <DateTime value={a.openedAt} dateOnly /> },
            {
              key: 'actions',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              render: (a) =>
                can('brokerAccounts.manage') ? (
                  <Button size="sm" onClick={() => openAccountEditor(a)}>
                    Modifier
                  </Button>
                ) : null,
            },
          ]}
        />
      </Section>

      <Section title="Derniers ordres" count={orders.length} emptyText="Aucun ordre passé par ce client.">
        <DataTable<Order>
          caption="Derniers ordres"
          rows={orders}
          rowKey={(o) => o.id}
          hideFooter
          columns={[
            { key: 'date', header: 'Date', nowrap: true, render: (o) => <DateTime value={o.submittedAt} /> },
            { key: 'instr', header: 'Valeur', render: (o) => <strong>{o.instrument?.symbol}</strong> },
            { key: 'side', header: 'Sens', render: (o) => <Badge kind="orderSide" value={o.side} /> },
            { key: 'qty', header: 'Quantité', align: 'right', numeric: true, render: (o) => formatNumber(o.quantity) },
            { key: 'total', header: 'Montant estimé', align: 'right', numeric: true, priority: 'secondary', render: (o) => <Money value={o.estimatedTotal} currency={o.instrument?.currency ?? 'XAF'} /> },
            { key: 'status', header: 'Statut', render: (o) => <Badge kind="order" value={o.status} /> },
          ]}
        />
      </Section>

      <Section title="Dossiers de conformité" count={cases.length} emptyText="Aucun dossier de conformité ouvert sur ce client.">
        <ul className="plain-list">
          {cases.map((c) => (
            <li key={c.id} className="row">
              <Link to={`/compliance?case=${c.id}`} className="strong">
                {c.reference}
              </Link>
              <span>{c.title}</span>
              <Badge kind="complianceCase" value={c.state} />
              <span className="muted small">
                ouvert le <DateTime value={c.openedAt} dateOnly />
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {blockDialog && (
        <ConfirmDialog
          title={user.isBlocked ? 'Débloquer le compte' : 'Bloquer le compte'}
          danger={!user.isBlocked}
          busy={busy}
          confirmLabel={user.isBlocked ? 'Demander le déblocage' : 'Bloquer le compte'}
          onCancel={() => setBlockDialog(false)}
          onConfirm={() => void toggleBlock()}
          message={
            user.isBlocked
              ? `${user.fullName} pourra de nouveau se connecter et passer des ordres une fois la demande validée par un second opérateur.`
              : `${user.fullName} ne pourra plus se connecter ni passer d’ordres. Le motif est tracé dans le journal d’audit.`
          }
        >
          {user.isBlocked ? (
            <ApprovalNotice />
          ) : (
            <TextAreaField label="Motif du blocage" rows={3} value={blockReason} onChange={(e) => setBlockReason(e.target.value)} hint="Visible par les autres opérateurs et dans le journal d’audit." autoFocus />
          )}
        </ConfirmDialog>
      )}

      {editingAccount && (
        <Modal
          title="Compte-titres"
          description={`Partenaire : ${editingAccount.partner?.name ?? 'SDB'}`}
          onClose={() => setEditingAccount(null)}
          footer={
            <>
              <Button onClick={() => setEditingAccount(null)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="primary" busy={busy} onClick={() => void saveAccount()}>
                Enregistrer
              </Button>
            </>
          }
        >
          <TextField
            label="Numéro de compte-titres attribué par la SDB"
            value={accountForm.externalAccountNo}
            onChange={(e) => {
              setAccountForm({ ...accountForm, externalAccountNo: e.target.value });
              setAccountError(null);
            }}
            error={accountError}
            required
            autoFocus
          />
          <SelectField label="État" value={accountForm.state} onChange={(e) => setAccountForm({ ...accountForm, state: e.target.value as BrokerAccountState })}>
            {options('brokerAccount', ACCOUNT_STATES).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </Modal>
      )}
    </div>
  );
}
