'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, LoaderCircle, TriangleAlert } from 'lucide-react';
import { AuthShell } from '../../components/auth/AuthShell';
import { primaryButtonCls } from '../../components/auth/authStyles';
import { announceEmailVerified } from '../../components/auth/emailVerificationSync';
import { useLanguage } from '../../components/home/language';
import { loginT, translateServerMessage } from '../../components/home/login-translations';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
// Sans onglet d'attente dans ce navigateur, la page renvoie vers la connexion après ce délai.
const REDIRECT_DELAY_MS = 3000;

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-slate-100 dark:bg-slate-950" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

type Status = 'checking' | 'success' | 'failed';

// Page ouverte par le lien de l'e-mail. Elle se limite à confirmer l'adresse : si l'onglet d'inscription est resté ouvert dans ce
// navigateur, c'est lui qui se met à jour et connecte l'utilisateur ; sinon cette page renvoie vers la connexion.
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const language = useLanguage();
  const t = (key: string) => loginT(key, language);
  const [status, setStatus] = useState<Status>('checking');
  const [failure, setFailure] = useState('');
  // true : un onglet d'attente a pris le relais ; false : aucun ; null : réponse pas encore connue.
  const [handedOver, setHandedOver] = useState<boolean | null>(null);
  const redirectTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = searchParams.get('token');
      if (!token) {
        setFailure('Le lien de vérification est invalide ou incomplet.');
        setStatus('failed');
        return;
      }
      void fetch(`${apiUrl}/auth/verify-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      })
        .then(async (response) => {
          const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
          const message = Array.isArray(data.message) ? data.message[0] : data.message;
          if (!response.ok) throw new Error(message || 'Le lien de vérification est invalide ou a expiré.');
          setStatus('success');
          // Prévient l'onglet d'attente (s'il existe) ; sans réponse, on renvoie vers la connexion.
          const acknowledged = await announceEmailVerified();
          setHandedOver(acknowledged);
          if (acknowledged) window.close(); // sans effet si l'onglet n'a pas été ouvert par un script : le message reste affiché
          else redirectTimer.current = window.setTimeout(() => router.replace('/login'), REDIRECT_DELAY_MS);
        })
        .catch((error: unknown) => {
          setFailure(error instanceof Error ? error.message : 'La vérification a échoué.');
          setStatus('failed');
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(redirectTimer.current);
    };
  }, [searchParams, router]);

  return (
    <AuthShell>
      <div className="space-y-5 text-center">
        {status === 'checking' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-8 ring-blue-50/60 dark:bg-white/10 dark:text-sky-300 dark:ring-white/5">
              <LoaderCircle className="h-8 w-8 animate-spin" aria-hidden />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-200">{t('verify.checking')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/5">
              <CheckCircle2 className="h-8 w-8" aria-hidden />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0b2c55] sm:text-3xl dark:text-white">{t('verify.success.title')}</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-200">
                {handedOver ? t('verify.handedOver') : handedOver === false ? t('verify.redirecting') : t('verify.success.text')}
              </p>
            </div>
            {handedOver !== true && <Link href="/login" className={primaryButtonCls}>{t('verify.toLogin')}</Link>}
          </>
        )}
        {status === 'failed' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-8 ring-amber-50/60 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/5">
              <TriangleAlert className="h-8 w-8" aria-hidden />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0b2c55] sm:text-3xl dark:text-white">{t('verify.failed.title')}</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-200">{translateServerMessage(failure, language)}</p>
            </div>
            <Link href="/login" className={primaryButtonCls}>{t('verify.toLogin')}</Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
