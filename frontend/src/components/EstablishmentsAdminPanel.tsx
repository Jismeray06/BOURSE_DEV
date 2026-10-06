'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Check, EyeOff, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { EstablishmentIcon, logoSrc } from './establishments';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const fieldCls = 'AccountInput w-full text-base sm:text-sm max-[1024px]:min-h-[44px]';
const touch = 'max-[1024px]:min-h-[44px]';

export type Institution = {
  id: string;
  name: string;
  logoUrl: string | null;
  active: boolean;
  studentCount: number;
  applicationCount: number;
  staffCount: number;
};

type Props = { institutions: Institution[]; onChanged: () => void };

// Gestion des établissements par l'administrateur : ajout, nom, logo, visibilité, suppression.
// Les changements sont visibles tout de suite dans la page étudiant (liste lue en direct depuis l'API).
export function EstablishmentsAdminPanel({ institutions, onChanged }: Props) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [logoTarget, setLogoTarget] = useState('');

  const request = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${sessionStorage.getItem('auth_token') ?? ''}`);
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
    const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message[0] : body.message ?? 'Une erreur est survenue.');
    return body;
  };
  const run = async (id: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await action();
      setMessage({ text: success, ok: true });
      onChanged();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Une erreur est survenue.', ok: false });
    } finally {
      setBusyId('');
    }
  };
  const json = { 'Content-Type': 'application/json' };

  const add = (event: FormEvent) => {
    event.preventDefault();
    void run('new', async () => {
      await request('/admin/institutions', { method: 'POST', headers: json, body: JSON.stringify({ name: newName }) });
      setNewName('');
    }, 'Établissement ajouté : il est déjà proposé aux étudiants.');
  };
  const saveName = (institution: Institution) =>
    void run(institution.id, async () => {
      await request(`/admin/institutions/${institution.id}`, { method: 'PATCH', headers: json, body: JSON.stringify({ name: editingName }) });
      setEditingId('');
    }, 'Nom mis à jour partout (comptes, dossiers, quitus…).');
  const toggle = (institution: Institution) =>
    void run(institution.id, () => request(`/admin/institutions/${institution.id}`, { method: 'PATCH', headers: json, body: JSON.stringify({ active: !institution.active }) }),
      institution.active ? 'Établissement masqué dans la page étudiant.' : 'Établissement de nouveau proposé aux étudiants.');
  const remove = (institution: Institution) => {
    if (!window.confirm(`Supprimer définitivement « ${institution.name} » ?`)) return;
    void run(institution.id, () => request(`/admin/institutions/${institution.id}`, { method: 'DELETE' }), 'Établissement supprimé.');
  };
  const removeLogo = (institution: Institution) =>
    void run(institution.id, () => request(`/admin/institutions/${institution.id}/logo`, { method: 'DELETE' }), 'Logo retiré.');
  const uploadLogo = (file: File | undefined) => {
    const id = logoTarget;
    if (fileInput.current) fileInput.current.value = '';
    if (!file || !id) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage({ text: 'Logo : PNG, JPG ou WebP, 5 Mo maximum.', ok: false });
      return;
    }
    const data = new FormData();
    data.append('file', file);
    void run(id, () => request(`/admin/institutions/${id}/logo`, { method: 'POST', body: data }), 'Logo mis à jour.');
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      <form onSubmit={add} className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
        <h2 className="text-base font-bold text-white">Ajouter un établissement</h2>
        <p className="mt-1 text-xs text-slate-400">Il apparaît immédiatement dans le choix d’établissement de la page étudiant.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input required minLength={2} maxLength={60} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nom de l’établissement" className={fieldCls} />
          <button disabled={busyId === 'new'} className={`flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50 ${touch}`}><Plus className="h-4 w-4" />Ajouter</button>
        </div>
      </form>

      {message && <p role="status" className={`break-words rounded-2xl border p-4 text-sm ${message.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>{message.text}</p>}

      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => uploadLogo(event.target.files?.[0])} />

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {institutions.map((institution) => {
          const logo = logoSrc(institution.logoUrl);
          const editing = editingId === institution.id;
          const busy = busyId === institution.id;
          return (
            <article key={institution.id} className={`min-w-0 rounded-3xl border bg-slate-900/90 p-4 sm:p-5 ${institution.active ? 'border-slate-800/80' : 'border-amber-500/30 opacity-80'}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {logo ? <img src={logo} alt={`Logo ${institution.name}`} className="h-full w-full object-contain" /> : <EstablishmentIcon name={institution.name} className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <input autoFocus value={editingName} maxLength={60} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveName(institution); if (event.key === 'Escape') setEditingId(''); }} aria-label="Nouveau nom" className={fieldCls} />
                      <button type="button" title="Enregistrer" aria-label="Enregistrer le nom" disabled={busy} onClick={() => saveName(institution)} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/40 text-emerald-300 ${touch}`}><Check className="h-4 w-4" /></button>
                      <button type="button" title="Annuler" aria-label="Annuler" onClick={() => setEditingId('')} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 ${touch}`}><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <h3 className="break-words text-sm font-bold text-white">{institution.name}</h3>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">{institution.studentCount} étudiant(s) · {institution.applicationCount} dossier(s) · {institution.staffCount} compte(s)</p>
                  {!institution.active && <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-300"><EyeOff className="h-3 w-3" />Masqué dans la page étudiant</p>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
                <button type="button" disabled={busy} onClick={() => { setEditingId(institution.id); setEditingName(institution.name); }} className={`flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-2 text-slate-300 transition hover:border-blue-500/50 hover:text-white ${touch}`}><Pencil className="h-3.5 w-3.5" />Renommer</button>
                <button type="button" disabled={busy} onClick={() => { setLogoTarget(institution.id); fileInput.current?.click(); }} className={`flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-2 text-slate-300 transition hover:border-blue-500/50 hover:text-white ${touch}`}><ImagePlus className="h-3.5 w-3.5" />{logo ? 'Changer le logo' : 'Ajouter un logo'}</button>
                {logo && <button type="button" disabled={busy} onClick={() => removeLogo(institution)} className={`rounded-lg border border-slate-700 px-2.5 py-2 text-slate-300 transition hover:border-rose-500/50 hover:text-rose-300 ${touch}`}>Retirer le logo</button>}
                <button type="button" disabled={busy} onClick={() => toggle(institution)} className={`rounded-lg border px-2.5 py-2 transition ${institution.active ? 'border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-300' : 'border-emerald-500/40 text-emerald-300'} ${touch}`}>{institution.active ? 'Masquer' : 'Afficher'}</button>
                <button type="button" disabled={busy} onClick={() => remove(institution)} aria-label={`Supprimer ${institution.name}`} title="Supprimer" className={`ml-auto flex items-center rounded-lg border border-slate-700 px-2.5 py-2 text-slate-300 transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300 ${touch}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </article>
          );
        })}
        {!institutions.length && <p className="col-span-full rounded-2xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">Aucun établissement. Ajoutez le premier ci-dessus.</p>}
      </div>
      <p className="text-xs text-slate-500">Renommer un établissement met à jour tous les comptes, dossiers, quitus et réglages qui lui sont rattachés. Un établissement qui a des données ne peut pas être supprimé : masquez-le plutôt.</p>
    </section>
  );
}
