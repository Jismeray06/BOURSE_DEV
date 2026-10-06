'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { EstablishmentIcon, logoSrc } from './establishments';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const touch = 'max-[1024px]:min-h-[44px]';

export type EstablishmentProfile = { id: string; name: string; logoUrl: string | null };

// Nom et logo de l'établissement, modifiables par son responsable. Le changement est visible
// aussitôt dans la page étudiant ; le renommage met à jour tous les dossiers rattachés.
export function EstablishmentIdentityPanel({ profile, onSaved }: { profile: EstablishmentProfile | null; onSaved: (profile: EstablishmentProfile) => void }) {
  const [name, setName] = useState(profile?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!profile) return <p className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Chargement…</p>;
  const logo = logoSrc(profile.logoUrl);

  const request = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${sessionStorage.getItem('auth_token') ?? ''}`);
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
    const body = (await response.json().catch(() => ({}))) as EstablishmentProfile & { message?: string | string[] };
    if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message[0] : body.message ?? 'Une erreur est survenue.');
    return body;
  };
  const run = async (action: () => Promise<EstablishmentProfile>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await action();
      setName(updated.name);
      onSaved(updated);
      setMessage({ text: success, ok: true });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Une erreur est survenue.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const saveName = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === profile.name) return;
    void run(() => request('/establishment/isstm/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }), 'Nom mis à jour : les étudiants le voient déjà.');
  };
  const uploadLogo = (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage({ text: 'Logo : PNG, JPG ou WebP, 5 Mo maximum.', ok: false });
      return;
    }
    const data = new FormData();
    data.append('file', file);
    void run(() => request('/establishment/isstm/profile/logo', { method: 'POST', body: data }), 'Logo mis à jour : les étudiants le voient déjà.');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="mb-1 font-bold text-white">Logo</h2>
        <p className="mb-4 text-xs text-slate-400">Affiché dans le choix d’établissement de la page étudiant et dans votre menu. PNG, JPG ou WebP, 5 Mo maximum.</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt={`Logo ${profile.name}`} className="h-full w-full object-contain" /> : <EstablishmentIcon name={profile.name} className="h-8 w-8" />}
          </div>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => uploadLogo(event.target.files?.[0])} />
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className={`flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-white disabled:opacity-50 ${touch}`}><ImagePlus className="h-4 w-4" />{logo ? 'Changer le logo' : 'Ajouter un logo'}</button>
            {logo && <button type="button" disabled={busy} onClick={() => void run(() => request('/establishment/isstm/profile/logo', { method: 'DELETE' }), 'Logo retiré.')} className={`flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-slate-300 hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-50 ${touch}`}><Trash2 className="h-4 w-4" />Retirer</button>}
          </div>
        </div>
      </section>

      <form onSubmit={saveName} className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="mb-1 font-bold text-white">Nom de l’établissement</h2>
        <p className="mb-4 text-xs text-slate-400">Le nom est mis à jour partout : étudiants, dossiers, quitus et attestations.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} aria-label="Nom de l’établissement" className="AccountInput w-full text-base sm:text-sm max-[1024px]:min-h-[44px]" />
          <button disabled={busy || name.trim() === profile.name} className={`shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50 ${touch}`}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>

      {message && <p role="status" className={`break-words rounded-2xl border p-4 text-sm ${message.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>{message.text}</p>}
    </div>
  );
}
