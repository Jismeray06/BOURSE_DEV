'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function VerifyEmailPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-md sm:p-8"><p className="text-sm text-slate-600">Chargement…</p></section></main>}><VerifyEmailContent /></Suspense>;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Vérification de votre adresse e-mail…');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = searchParams.get('token');
      if (!token) {
        setMessage('Le lien de vérification est invalide ou incomplet.');
        return;
      }
      void fetch(`${apiUrl}/auth/verify-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      })
        .then(async (response) => {
          const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
          const responseMessage = Array.isArray(data.message) ? data.message[0] : data.message;
          if (!response.ok) throw new Error(responseMessage || 'Le lien de vérification est invalide ou a expiré.');
          setVerified(true);
          setMessage(responseMessage || 'Votre adresse e-mail a été vérifiée.');
        })
        .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'La vérification a échoué.'));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-md p-6 sm:p-8 space-y-5">
        <h1 className="text-2xl font-bold text-slate-900">Vérification de l&apos;adresse e-mail</h1>
        <p className={verified ? 'text-sm text-emerald-700' : 'text-sm text-slate-600'}>{message}</p>
        <Link href="/login" className="inline-block text-sm text-blue-600 hover:underline font-medium">Retour à la connexion</Link>
      </section>
    </main>
  );
}
