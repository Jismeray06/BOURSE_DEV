'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Camera, Eye, EyeOff, KeyRound, Mail, Trash2 } from 'lucide-react';
import { avatarSrc, notifyProfileChanged, useProfile } from './useProfile';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const fieldCls = 'AccountInput w-full text-base sm:text-sm max-[1024px]:min-h-[44px]';
const touch = 'max-[1024px]:min-h-[44px]';

type Feedback = { text: string; ok: boolean } | null;

async function accountRequest(path: string, method: string, body?: unknown) {
  const response = await fetch(`${apiUrl}/account${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('auth_token') ?? ''}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = (await response.json().catch(() => ({}))) as { message?: string | string[] } & Record<string, unknown>;
  if (!response.ok) throw new Error((Array.isArray(result.message) ? result.message[0] : result.message) ?? 'Une erreur est survenue.');
  return result;
}

// Modification, par l'utilisateur lui-même, de son mot de passe et de son adresse e-mail.
// Utilisable dans n'importe quel espace connecté.
export function AccountPanel() {
  const profile = useProfile();

  return (
    <div className="space-y-4 sm:space-y-6">
      <AvatarSection fullName={profile?.fullName ?? ''} email={profile?.email ?? ''} avatarUrl={profile?.avatarUrl ?? null} loaded={Boolean(profile)} />
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <EmailForm currentEmail={profile?.email ?? ''} />
        <PasswordForm />
      </div>
    </div>
  );
}

// Carré de 256 px recadré au centre : photo légère et de format uniforme, même depuis un téléphone.
async function squareJpeg(file: File, size = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Cette image est illisible : choisissez un fichier PNG, JPG ou WebP valide.'); });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error("Impossible de préparer l'image.");
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Impossible de préparer l'image."))), 'image/jpeg', 0.9));
}

function AvatarSection({ fullName, email, avatarUrl, loaded }: { fullName: string; email: string; avatarUrl: string | null; loaded: boolean }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const input = useRef<HTMLInputElement>(null);
  const photo = avatarSrc(avatarUrl);
  const initials = fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';

  const authorization = () => ({ Authorization: `Bearer ${sessionStorage.getItem('auth_token') ?? ''}` });
  const finish = async (response: Response, success: string) => {
    const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    if (!response.ok) throw new Error((Array.isArray(body.message) ? body.message[0] : body.message) ?? 'Une erreur est survenue.');
    setFeedback({ text: success, ok: true });
    notifyProfileChanged();
  };

  const upload = async (file: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFeedback({ text: 'Choisissez une image (PNG, JPG ou WebP).', ok: false }); return; }
    setBusy(true);
    setFeedback(null);
    try {
      const data = new FormData();
      data.append('file', await squareJpeg(file), 'photo.jpg');
      await finish(await fetch(`${apiUrl}/account/avatar`, { method: 'POST', headers: authorization(), body: data }), 'Photo de profil mise à jour.');
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Impossible de lire cette image.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await finish(await fetch(`${apiUrl}/account/avatar`, { method: 'DELETE', headers: authorization() }), 'Photo retirée.');
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Une erreur est survenue.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
      <h2 className="text-base font-bold text-white">Mon compte</h2>
      <div className="mt-4 flex flex-wrap items-center gap-4 sm:gap-5">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-2xl font-black text-white sm:h-24 sm:w-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo ? <img src={photo} alt="Photo de profil" className="h-full w-full object-cover" /> : initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{loaded ? fullName : 'Chargement…'}</p>
          <p className="break-all text-xs text-slate-400">{email}</p>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className={`flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-white transition hover:bg-blue-500 disabled:opacity-50 ${touch}`}><Camera className="h-4 w-4" />{busy ? 'Envoi…' : photo ? 'Changer la photo' : 'Ajouter une photo'}</button>
            {photo && <button type="button" disabled={busy} onClick={() => void remove()} className={`flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-slate-300 transition hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-50 ${touch}`}><Trash2 className="h-4 w-4" />Retirer</button>}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">PNG, JPG ou WebP. La photo est recadrée en carré. Elle apparaît dans l’en-tête de votre espace.</p>
        </div>
      </div>
      {feedback && <p role="status" className={`mt-4 break-words rounded-xl border p-3 text-xs ${feedback.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>{feedback.text}</p>}
    </section>
  );
}

function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const result = await accountRequest('/email', 'POST', { newEmail, currentPassword: password });
      setFeedback({ text: String(result.message), ok: true });
      setNewEmail('');
      setPassword('');
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Une erreur est survenue.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="min-w-0 rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400"><Mail className="h-5 w-5" /></div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-white">Adresse e-mail</h3>
          <p className="mt-0.5 text-xs text-slate-400">Un lien de confirmation est envoyé à la <strong>nouvelle</strong> adresse. L’ancienne reste active tant que vous n’avez pas cliqué.</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-300">Adresse actuelle</label>
          <input readOnly value={currentEmail} className={`${fieldCls} opacity-70`} />
        </div>
        <div>
          <label htmlFor="new-email" className="mb-1 block text-xs font-semibold text-slate-300">Nouvelle adresse e-mail</label>
          <input id="new-email" required type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className={fieldCls} />
        </div>
        <PasswordInput id="email-password" label="Mot de passe actuel" value={password} onChange={setPassword} autoComplete="current-password" />
        {feedback && <p role="status" className={`break-words rounded-xl border p-3 text-xs ${feedback.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>{feedback.text}</p>}
        <button disabled={busy} className={`w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50 sm:w-auto ${touch}`}>{busy ? 'Envoi…' : 'Envoyer le lien de confirmation'}</button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (next !== confirm) { setFeedback({ text: 'Les deux nouveaux mots de passe ne correspondent pas.', ok: false }); return; }
    setBusy(true);
    try {
      const result = await accountRequest('/password', 'PATCH', { currentPassword: current, newPassword: next });
      setFeedback({ text: String(result.message), ok: true });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Une erreur est survenue.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="min-w-0 rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400"><KeyRound className="h-5 w-5" /></div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-white">Mot de passe</h3>
          <p className="mt-0.5 text-xs text-slate-400">8 caractères minimum. Le mot de passe actuel est demandé pour confirmer que c’est bien vous.</p>
        </div>
      </div>
      <div className="space-y-3">
        <PasswordInput id="current-password" label="Mot de passe actuel" value={current} onChange={setCurrent} autoComplete="current-password" />
        <PasswordInput id="new-password" label="Nouveau mot de passe" value={next} onChange={setNext} autoComplete="new-password" minLength={8} />
        <PasswordInput id="confirm-password" label="Confirmer le nouveau mot de passe" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={8} />
        {feedback && <p role="status" className={`break-words rounded-xl border p-3 text-xs ${feedback.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>{feedback.text}</p>}
        <button disabled={busy} className={`w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50 sm:w-auto ${touch}`}>{busy ? 'Enregistrement…' : 'Modifier le mot de passe'}</button>
      </div>
    </form>
  );
}

function PasswordInput({ id, label, value, onChange, autoComplete, minLength }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-300">{label}</label>
      <div className="relative">
        <input id={id} required type={visible ? 'text' : 'password'} minLength={minLength} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldCls} pr-11`} />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200">
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
