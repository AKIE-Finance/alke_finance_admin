import { useState } from 'react';
import { api } from '../api';
import type { ConfigValue, PendingApproval } from '../api/types';
import { useAuth } from '../auth';
import ApprovalNotice from '../components/ApprovalNotice';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import DateTime from '../components/DateTime';
import { TextAreaField } from '../components/Field';
import FilterBar from '../components/FilterBar';
import JsonView from '../components/JsonView';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { useBusy, useLoad } from '../hooks';

/** Interprète la saisie : JSON valide → valeur typée, sinon chaîne brute. */
function interpret(text: string): { value: unknown; kind: string } {
  const t = text.trim();
  if (t === '') return { value: '', kind: 'chaîne vide' };
  try {
    const value: unknown = JSON.parse(t);
    if (value === null) return { value, kind: 'null' };
    if (Array.isArray(value)) return { value, kind: 'tableau' };
    if (typeof value === 'object') return { value, kind: 'objet' };
    if (typeof value === 'number') return { value, kind: 'nombre' };
    if (typeof value === 'boolean') return { value, kind: 'booléen' };
    return { value, kind: 'chaîne (JSON)' };
  } catch {
    return { value: text, kind: 'chaîne' };
  }
}

function display(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function approver(v: ConfigValue): string {
  if (!v.approvedBy) return '—';
  return typeof v.approvedBy === 'string' ? v.approvedBy : v.approvedBy.fullName;
}

export default function ConfigPage() {
  const { can } = useAuth();
  const change = can('config.change');
  const { data, loading, reload } = useLoad(() => api.config.list(), []);
  const { busy, run } = useBusy();

  const [editing, setEditing] = useState<ConfigValue | null>(null);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [approval, setApproval] = useState<PendingApproval | null>(null);

  const open = (v: ConfigValue) => {
    setText(typeof v.value === 'string' ? v.value : JSON.stringify(v.value, null, 2));
    setReason('');
    setReasonError(null);
    setEditing(v);
  };

  const submit = async () => {
    if (!editing) return;
    if (reason.trim().length < 5) {
      setReasonError('Le motif est obligatoire (5 caractères minimum).');
      return;
    }
    const { value } = interpret(text);
    const res = await run(() => api.config.requestChange(editing.key, { value, reason: reason.trim() }), 'Demande de modification soumise à validation à deux yeux.');
    if (res === undefined) return;
    setApproval(res);
    setEditing(null);
  };

  const preview = interpret(text);

  return (
    <div>
      <PageHeader title="Configuration" subtitle="Consultez les paramètres de la plateforme (plafonds, cut-offs, seuils) et proposez une modification, validée par un second opérateur." breadcrumb={[{ label: 'Contrôle' }, { label: 'Configuration' }]} />

      {approval && <ApprovalNotice approval={approval} message="La modification de configuration a été soumise à validation." />}

      <FilterBar onRefresh={reload} refreshing={loading}>
        <p className="muted small mb-0">Chaque valeur est horodatée et porte le nom de l’opérateur qui l’a approuvée.</p>
      </FilterBar>

      <div className="card card-table">
        <DataTable<ConfigValue>
          caption="Valeurs de configuration"
          loading={loading}
          rows={data}
          rowKey={(v) => v.key}
          empty={{ kind: 'files', title: 'Aucune valeur de configuration', hint: 'Les paramètres sont initialisés par l’équipe technique au déploiement.' }}
          columns={[
            { key: 'key', header: 'Clé', render: (v) => <strong className="mono">{v.key}</strong> },
            {
              key: 'value',
              header: 'Valeur',
              render: (v) => {
                const s = display(v.value);
                return (
                  <span className="mono" title={s}>
                    {s.length > 80 ? `${s.slice(0, 80)}…` : s}
                  </span>
                );
              },
            },
            { key: 'from', header: 'En vigueur depuis', priority: 'secondary', nowrap: true, render: (v) => <DateTime value={v.effectiveFrom} /> },
            { key: 'by', header: 'Approuvée par', priority: 'detail', render: (v) => approver(v) },
            {
              key: 'actions',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              render: (v) =>
                change ? (
                  <Button size="sm" onClick={() => open(v)}>
                    Modifier
                  </Button>
                ) : null,
            },
          ]}
        />
      </div>

      {editing && (
        <Modal
          title="Modifier un paramètre"
          description={
            <>
              Clé <span className="mono">{editing.key}</span>
            </>
          }
          onClose={() => setEditing(null)}
          width={620}
          footer={
            <>
              <Button onClick={() => setEditing(null)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="primary" onClick={() => void submit()} busy={busy}>
                Soumettre la demande
              </Button>
            </>
          }
        >
          <ApprovalNotice />
          <div className="stat-label">Valeur actuelle</div>
          <JsonView value={editing.value} maxHeight={140} />
          <TextAreaField
            label="Nouvelle valeur"
            rows={5}
            className="mono"
            value={text}
            onChange={(e) => setText(e.target.value)}
            hint={`Interprétée comme : ${preview.kind}. Un JSON valide (nombre, booléen, objet, tableau) est envoyé typé ; sinon la saisie est envoyée telle quelle en chaîne.`}
            autoFocus
            required
          />
          <TextAreaField
            label="Motif"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError(null);
            }}
            error={reasonError}
            required
            hint="Visible du valideur et tracé dans le journal d’audit."
          />
        </Modal>
      )}
    </div>
  );
}
