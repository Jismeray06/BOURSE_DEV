'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Mail, RotateCcw, Trash2, UserPlus, Users } from 'lucide-react';
import { ConfirmDialog } from '../layout/ConfirmDialog';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const touch = 'max-[1024px]:min-h-[44px]';
const smallButton = `flex-1 rounded-lg border border-slate-700 px-3 py-2 text-xs sm:flex-none ${touch}`;

type Secretary = { id: string; fullName: string; email: string; active: boolean; createdAt: string };
type TrashedSecretary = { id: string; fullName: string; email: string; deletedAt: string };
type Confirmation = { kind: 'trash' | 'purge'; id: string; name: string };
type Result = { emailSent?: boolean };

function Field({ label, value, onChange, placeholder, type = 'text', required = true }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <label className="min-w-0 text-xs text-slate-300">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 max-[1024px]:min-h-[44px]"
      />
    </label>
  );
}

// Comptes des secrétaires de la scolarité : créés et gérés par le responsable de la scolarité centrale.
// Un secrétaire traite les dossiers (consultation, validation, refus motivé) mais ne gère ni les comptes ni les pièces demandées.
export function CentralSecretariesPanel() {
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [trash, setTrash] = useState<TrashedSecretary[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', password: '' });
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const request = useCallback((path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${sessionStorage.getItem('auth_token') ?? ''}`);
    return fetch(`${apiUrl}${path}`, { ...options, headers });
  }, []);

  const errorMessage = async (response: Response) => {
    const result = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    return (Array.isArray(result.message) ? result.message[0] : result.message) ?? 'Action impossible.';
  };

  const load = useCallback(async () => {
    const [active, trashed] = await Promise.all([request('/scolarite/secretaries'), request('/scolarite/secretaries/trash')]);
    if (active.ok) setSecretaries((await active.json()) as Secretary[]);
    else setMessage(await errorMessage(active));
    if (trashed.ok) setTrash((await trashed.json()) as TrashedSecretary[]);
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Envoie une action, affiche le message correspondant puis recharge les listes.
  const send = async (path: string, method: 'POST' | 'PATCH' | 'DELETE', body: unknown, success: string | ((result: Result) => string)) => {
    setSaving(true);
    setMessage('');
    const response = await request(path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const ok = response.ok;
    if (ok) {
      const result = (await response.json().catch(() => ({}))) as Result;
      setMessage(typeof success === 'string' ? success : success(result));
      await load();
    } else {
      setMessage(await errorMessage(response));
    }
    setSaving(false);
    return ok;
  };

  const addSecretary = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await send('/scolarite/secretaries', 'POST', form, (result) =>
      result.emailSent
        ? `Compte secrétaire créé. Un e-mail a été envoyé à ${form.email}. Communiquez-lui son mot de passe séparément.`
        : `Compte secrétaire créé, mais l’e-mail n’a pas pu être envoyé à ${form.email}. Prévenez la personne vous-même.`,
    );
    if (created) setForm({ fullName: '', email: '', password: '' });
  };

  const startEdit = (secretary: Secretary) => {
    setEditingId(secretary.id);
    setEditForm({ fullName: secretary.fullName, email: secretary.email, password: '' });
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>, secretary: Secretary) => {
    event.preventDefault();
    // Seuls les champs réellement modifiés sont envoyés.
    const body = {
      ...(editForm.fullName !== secretary.fullName ? { fullName: editForm.fullName } : {}),
      ...(editForm.email.trim().toLowerCase() !== secretary.email ? { email: editForm.email } : {}),
      ...(editForm.password ? { password: editForm.password } : {}),
    };
    if (!Object.keys(body).length) { setEditingId(null); return; }
    const emailChanged = 'email' in body;
    if (await send(`/scolarite/secretaries/${secretary.id}`, 'PATCH', body, emailChanged ? 'Compte modifié. L’ancienne adresse a été prévenue du changement.' : 'Compte secrétaire modifié.')) setEditingId(null);
  };

  const toggleStatus = (secretary: Secretary) =>
    send(`/scolarite/secretaries/${secretary.id}/status`, 'PATCH', { active: !secretary.active }, `Compte ${secretary.active ? 'désactivé' : 'activé'}.`);

  const resendWelcome = (secretary: Secretary) =>
    send(`/scolarite/secretaries/${secretary.id}/welcome-email`, 'POST', undefined, (result) =>
      result.emailSent ? `E-mail renvoyé à ${secretary.email}.` : `L’e-mail n’a pas pu être envoyé à ${secretary.email}.`,
    );

  const confirmAction = async () => {
    const current = confirmation;
    setConfirmation(null);
    if (!current) return;
    if (current.kind === 'trash') await send(`/scolarite/secretaries/${current.id}`, 'DELETE', undefined, 'Compte placé dans la corbeille.');
    else await send(`/scolarite/secretaries/${current.id}/purge`, 'DELETE', undefined, 'Compte supprimé définitivement.');
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <h2 className="mb-1 flex items-center gap-2 font-bold">
        <Users className="h-4 w-4" />
        Comptes secrétaires
      </h2>
      <p className="mb-4 text-xs text-slate-400">
        Un secrétaire de la scolarité peut consulter, valider ou refuser les dossiers. Il ne peut pas gérer les comptes ni modifier les pièces demandées aux étudiants.
      </p>
      {message && <p className="mb-4 break-words rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-100">{message}</p>}
      <form onSubmit={addSecretary} className="mb-5 grid gap-3 md:grid-cols-3">
        <Field label="Nom complet" value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} placeholder="Nom du secrétaire" />
        <Field label="E-mail" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="secretariat@univ-mahajanga.mg" />
        <Field label="Mot de passe" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} placeholder="8 caractères minimum" />
        <button disabled={saving} className={`rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold md:col-span-3 ${touch}`}>
          <UserPlus className="mr-1 inline h-4 w-4" />
          Créer le compte secrétaire
        </button>
      </form>
      <div className="space-y-2">
        {secretaries.map((secretary) => (
          <div key={secretary.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <b className="break-words">{secretary.fullName}</b>
                <p className="break-all text-xs text-slate-500">{secretary.email}</p>
              </div>
              <span className={`shrink-0 ${secretary.active ? 'text-emerald-400' : 'text-slate-500'}`}>{secretary.active ? 'Actif' : 'Désactivé'}</span>
            </div>
            {editingId === secretary.id ? (
              <form onSubmit={(event) => void saveEdit(event, secretary)} className="mt-3 grid gap-2 sm:grid-cols-2">
                <Field label="Nom complet" value={editForm.fullName} onChange={(value) => setEditForm({ ...editForm, fullName: value })} placeholder="Nom du secrétaire" />
                <Field label="E-mail" type="email" value={editForm.email} onChange={(value) => setEditForm({ ...editForm, email: value })} placeholder="secretariat@univ-mahajanga.mg" />
                <div className="sm:col-span-2">
                  <Field label="Nouveau mot de passe" type="password" required={false} value={editForm.password} onChange={(value) => setEditForm({ ...editForm, password: value })} placeholder="Laisser vide pour conserver" />
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button type="submit" disabled={saving} className={`flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold sm:flex-none ${touch}`}>Enregistrer</button>
                  <button type="button" onClick={() => setEditingId(null)} className={smallButton}>Annuler</button>
                </div>
              </form>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => startEdit(secretary)} className={smallButton}>Modifier</button>
                <button onClick={() => void toggleStatus(secretary)} disabled={saving} className={smallButton}>{secretary.active ? 'Désactiver' : 'Activer'}</button>
                <button onClick={() => void resendWelcome(secretary)} disabled={saving} className={smallButton}>
                  <Mail className="mr-1 inline h-3.5 w-3.5" />
                  Renvoyer l’e-mail
                </button>
                <button
                  onClick={() => setConfirmation({ kind: 'trash', id: secretary.id, name: secretary.fullName })}
                  disabled={saving}
                  className={`${smallButton} text-rose-300`}
                >
                  <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        ))}
        {!secretaries.length && <p className="text-sm text-slate-500">Aucun compte secrétaire.</p>}
      </div>

      <div className="mt-6 border-t border-slate-800 pt-4">
        <button onClick={() => setShowTrash((value) => !value)} className={`flex items-center gap-2 text-xs font-bold text-slate-300 ${touch}`} aria-expanded={showTrash}>
          <Trash2 className="h-4 w-4" />
          Corbeille ({trash.length})
        </button>
        {showTrash && (
          <div className="mt-3 space-y-2">
            {trash.map((secretary) => (
              <div key={secretary.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm">
                <b className="break-words">{secretary.fullName}</b>
                <p className="break-all text-xs text-slate-500">{secretary.email} · supprimé le {new Date(secretary.deletedAt).toLocaleDateString('fr-FR')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => void send(`/scolarite/secretaries/${secretary.id}/restore`, 'POST', undefined, 'Compte restauré.')} disabled={saving} className={smallButton}>
                    <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
                    Restaurer
                  </button>
                  <button onClick={() => setConfirmation({ kind: 'purge', id: secretary.id, name: secretary.fullName })} disabled={saving} className={`${smallButton} text-rose-300`}>
                    Supprimer définitivement
                  </button>
                </div>
              </div>
            ))}
            {!trash.length && <p className="text-sm text-slate-500">La corbeille est vide.</p>}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmation !== null}
        title={confirmation?.kind === 'purge' ? 'Supprimer définitivement ?' : 'Supprimer ce compte ?'}
        message={
          confirmation?.kind === 'purge'
            ? `Le compte de ${confirmation.name} sera effacé pour toujours. Cette action est irréversible.`
            : `Le compte de ${confirmation?.name ?? ''} sera placé dans la corbeille : il ne pourra plus se connecter, mais vous pourrez le restaurer.`
        }
        confirmLabel={confirmation?.kind === 'purge' ? 'Supprimer définitivement' : 'Supprimer'}
        cancelLabel="Annuler"
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void confirmAction()}
      />
    </section>
  );
}
