'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, LoaderCircle, Mail, RefreshCw } from 'lucide-react';
import { errorBoxCls, fieldCls, iconCls, labelCls, linkCls, primaryButtonCls, successBoxCls } from './authStyles';
import { useLanguage } from '../home/language';
import { loginT, translateServerMessage } from '../home/login-translations';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const RESEND_DELAY = 60;

type Props = { initialEmail: string; onBackToLogin: () => void };

// Mot de passe oublié : saisie de l'adresse, puis écran de confirmation. Le serveur répond de la même façon que l'adresse
// corresponde ou non à un compte ; le message affiché ne dit donc jamais si l'adresse est inscrite.
export function ForgotPasswordPanel({ initialEmail, onBackToLogin }: Props) {
  const language = useLanguage();
  const t = (key: string, values?: Record<string, string | number>) => loginT(key, language, values);
  // Les messages sont conservés tels quels et traduits à l'affichage : ils changent de langue avec le sélecteur.
  const shown = (message: string) => translateServerMessage(message, language);
  const [email, setEmail] = useState(initialEmail);
  const [sentTo, setSentTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const send = async (address: string) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: address.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      const text = Array.isArray(data.message) ? data.message[0] : data.message;
      if (!response.ok) throw new Error(text || 'Une erreur est survenue.');
      setSentTo(address.trim());
      setCooldown(RESEND_DELAY);
      // Le message de réponse n'est montré qu'en cas de nouvel envoi : l'écran de confirmation dit déjà l'essentiel.
      if (sentTo) setMessage(text ?? '');
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(email);
  };

  if (sentTo) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-8 ring-blue-50/60 dark:bg-white/10 dark:text-sky-300 dark:ring-white/5">
          <Mail className="h-8 w-8" aria-hidden />
        </div>
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-400/10 dark:text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {t('forgot.sent.badge')}
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0b2c55] sm:text-3xl dark:text-white">{t('forgot.sent.title')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-200">{t('forgot.sent.intro')}</p>
          <p className="mt-1 break-all text-sm font-bold text-slate-900 dark:text-white">{sentTo}</p>
        </div>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-300">{t('forgot.sent.tip')}</p>
        {message && <p role="status" className={`${successBoxCls} text-left`}>{shown(message)}</p>}
        {error && <p role="alert" className={`${errorBoxCls} text-left`}>{shown(error)}</p>}
        <button type="button" onClick={() => void send(sentTo)} disabled={loading || cooldown > 0} className={primaryButtonCls}>
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          {cooldown > 0 ? t('forgot.sent.resendIn', { seconds: cooldown }) : t('forgot.sent.resend')}
        </button>
        <div className="flex flex-col items-center gap-2 border-t border-slate-200 pt-4 text-sm dark:border-white/15">
          <button type="button" onClick={() => { setSentTo(''); setMessage(''); setError(''); setCooldown(0); }} className={linkCls}>{t('forgot.sent.otherAddress')}</button>
          <button type="button" onClick={onBackToLogin} className="inline-flex cursor-pointer items-center gap-1.5 text-slate-600 hover:underline dark:text-slate-200">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t('forgot.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-8 ring-blue-50/60 dark:bg-white/10 dark:text-sky-300 dark:ring-white/5">
          <KeyRound className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0b2c55] sm:text-3xl dark:text-white">{t('forgot.title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-200">{t('forgot.subtitle')}</p>
      </div>
      {error && <p role="alert" className={errorBoxCls}>{shown(error)}</p>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="forgot-email" className={labelCls}>{t('field.email')}</label>
          <div className="relative">
            <Mail className={iconCls} aria-hidden />
            <input id="forgot-email" type="email" required autoFocus placeholder={t('field.email')} value={email} onChange={(event) => setEmail(event.target.value)} className={fieldCls} />
          </div>
        </div>
        <button type="submit" disabled={loading} className={primaryButtonCls}>
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          {t(loading ? 'forgot.sending' : 'forgot.submit')}
        </button>
      </form>
      <div className="border-t border-slate-200 pt-4 text-center text-sm dark:border-white/15">
        <button type="button" onClick={onBackToLogin} className="inline-flex cursor-pointer items-center gap-1.5 text-slate-600 hover:underline dark:text-slate-200">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('forgot.back')}
        </button>
      </div>
    </div>
  );
}
