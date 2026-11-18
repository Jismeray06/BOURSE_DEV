'use client';

import { ArrowLeft, CheckCircle2, LoaderCircle, Mail, RefreshCw } from 'lucide-react';
import { useLanguage } from '../home/language';
import { loginT } from '../home/login-translations';

type Props = {
  email: string;
  // « register » : le compte vient d'être créé ; « login » : la connexion a été refusée faute d'adresse vérifiée.
  reason: 'register' | 'login';
  loading: boolean;
  cooldown: number;
  // Messages déjà traduits par la page.
  message: string;
  error: string;
  onResend: () => void;
  onChangeAddress: () => void;
  onBackToLogin: () => void;
};

const STEP_KEYS = ['await.step1', 'await.step2', 'await.step3'];

// Écran affiché dans la carte de connexion tant que l'adresse e-mail n'est pas confirmée.
export function AwaitingEmailVerification({ email, reason, loading, cooldown, message, error, onResend, onChangeAddress, onBackToLogin }: Props) {
  const language = useLanguage();
  const t = (key: string, values?: Record<string, string | number>) => loginT(key, language, values);
  const waiting = cooldown > 0;
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-8 ring-blue-50/60 dark:bg-white/10 dark:text-sky-300 dark:ring-white/5">
        <Mail className="h-8 w-8" aria-hidden />
      </div>

      <div>
        <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden />
          {t('await.badge')}
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0b2c55] sm:text-3xl dark:text-white">{t('await.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-200">{t(reason === 'register' ? 'await.intro.register' : 'await.intro.login')}</p>
        <p className="mt-1 break-all text-sm font-bold text-slate-900 dark:text-white">{email}</p>
      </div>

      <ol className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-100">
        {STEP_KEYS.map((key, index) => (
          <li key={key} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{index + 1}</span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ol>

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-300">{t('await.tip')}</p>
      <p className="flex items-center justify-center gap-2 text-xs font-medium text-blue-700 dark:text-sky-200">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
        {t('await.auto')}
      </p>

      {message && (
        <p role="status" className="flex items-start justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left text-xs font-medium text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {message}
        </p>
      )}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-left text-xs font-medium text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100">{error}</p>}

      <button
        type="button"
        onClick={onResend}
        disabled={loading || waiting}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
        {waiting ? t('await.resendIn', { seconds: cooldown }) : t('await.resend')}
      </button>

      <div className="flex flex-col items-center gap-2 border-t border-slate-200 pt-4 text-sm dark:border-white/15">
        {reason === 'register' && (
          <button type="button" onClick={onChangeAddress} className="cursor-pointer font-medium text-blue-600 hover:underline dark:text-sky-300">
            {t('await.otherAddress')}
          </button>
        )}
        <button type="button" onClick={onBackToLogin} className="inline-flex cursor-pointer items-center gap-1.5 text-slate-600 hover:underline dark:text-slate-200">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('await.backToLogin')}
        </button>
      </div>
    </div>
  );
}
