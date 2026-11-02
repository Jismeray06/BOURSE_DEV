'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, Lock, LoaderCircle, LockKeyhole, TriangleAlert } from 'lucide-react';
import { AuthShell } from '../../components/auth/AuthShell';
import { errorBoxCls, eyeCls, fieldCls, iconCls, labelCls, primaryButtonCls } from '../../components/auth/authStyles';
import { useLanguage } from '../../components/home/language';
import { loginT, translateServerMessage } from '../../components/home/login-translations';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-slate-100 dark:bg-slate-950" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

// Page ouverte depuis le lien de l'e-mail « Réinitialisez votre mot de passe » : l'utilisateur y choisit un nouveau mot de passe.
function ResetPasswordContent() {
  const token = useSearchParams().get('token') ?? '';
  const language = useLanguage();
  const t = (key: string) => loginT(key, language);
  const shown = (message: string) => translateServerMessage(message, language);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  // Lien absent, expiré ou déjà utilisé : on propose d'en demander un nouveau.
  const [invalidLink, setInvalidLink] = useState(!token);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas !'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      const message = Array.isArray(data.message) ? data.message[0] : data.message;
      if (!response.ok) {
        if (message?.includes('Ce lien de réinitialisation')) { setInvalidLink(true); return; }
        throw new Error(message || 'Une erreur est survenue.');
      }
      setDone(true);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/5">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </div>
          <div>
            <p className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-400/10 dark:text-emerald-200">{t('reset.success.badge')}</p>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0b2c55] sm:text-3xl dark:text-white">{t('reset.success.title')}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-200">{t('reset.success.text')}</p>
          </div>
          <Link href="/login" className={primaryButtonCls}>{t('reset.success.button')}</Link>
        </div>
      </AuthShell>
    );
  }

  if (invalidLink) {
    return (
      <AuthShell>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-8 ring-amber-50/60 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/5">
            <TriangleAlert className="h-8 w-8" aria-hidden />
          </div>
          <div>
            <p className="mb-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-200">{t('reset.invalid.badge')}</p>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0b2c55] sm:text-3xl dark:text-white">{t('reset.invalid.title')}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-200">{t('reset.invalid.text')}</p>
          </div>
          <Link href="/login?mode=forgot" className={primaryButtonCls}>{t('reset.invalid.button')}</Link>
          <Link href="/login" className="inline-block text-sm text-slate-600 hover:underline dark:text-slate-200">{t('forgot.back')}</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-8 ring-blue-50/60 dark:bg-white/10 dark:text-sky-300 dark:ring-white/5">
          <LockKeyhole className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0b2c55] sm:text-3xl dark:text-white">{t('reset.title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-200">{t('reset.subtitle')}</p>
      </div>
      {error && <p role="alert" className={errorBoxCls}>{shown(error)}</p>}
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <div>
          <label htmlFor="new-password" className={labelCls}>{t('reset.newPassword')}</label>
          <div className="relative">
            <Lock className={iconCls} aria-hidden />
            <input id="new-password" type={showPassword ? 'text' : 'password'} required autoFocus autoComplete="new-password" placeholder={t('reset.newPassword')} value={password} onChange={(event) => setPassword(event.target.value)} className={`${fieldCls} pr-10`} />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={t(showPassword ? 'password.hide' : 'password.show')} className={eyeCls}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-300">{t('reset.rules')}</p>
        </div>
        <div>
          <label htmlFor="confirm-new-password" className={labelCls}>{t('reset.confirm')}</label>
          <div className="relative">
            <Lock className={iconCls} aria-hidden />
            <input id="confirm-new-password" type={showConfirm ? 'text' : 'password'} required autoComplete="new-password" placeholder={t('reset.confirm')} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={`${fieldCls} pr-10`} />
            <button type="button" onClick={() => setShowConfirm((value) => !value)} aria-label={t(showConfirm ? 'confirm.hide' : 'confirm.show')} className={eyeCls}>
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className={primaryButtonCls}>
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          {t(loading ? 'reset.saving' : 'reset.submit')}
        </button>
      </form>
    </AuthShell>
  );
}
