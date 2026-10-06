'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { dashboardPathForRole } from '../../../components/dashboardPath';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type ExchangeResponse = {
  message?: string | string[];
  accessToken?: string;
  user?: { id?: string; fullName?: string; email?: string; role?: string };
};

export default function GoogleLoginPage() {
  return <Suspense fallback={<Shell message="Connexion en cours…" />}><GoogleLoginContent /></Suspense>;
}

function GoogleLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const code = searchParams.get('code');
  // Le code est à usage unique : on ne l'échange qu'une fois, même si l'effet est rejoué (mode strict).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!code) return;
    void fetch(`${apiUrl}/auth/google/exchange`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as ExchangeResponse;
        if (!response.ok) throw new Error((Array.isArray(data.message) ? data.message[0] : data.message) || 'La connexion Google a échoué.');
        const destination = dashboardPathForRole(data.user?.role ?? null);
        if (!data.accessToken || !data.user?.role || !destination) throw new Error('Réponse de connexion invalide.');
        sessionStorage.setItem('auth_token', data.accessToken);
        sessionStorage.setItem('user_role', data.user.role);
        sessionStorage.setItem('auth_user', JSON.stringify(data.user));
        router.replace(destination);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Impossible de joindre le serveur.'));
  }, [router, code]);

  const message = !code ? 'Le lien de connexion Google est invalide ou incomplet.' : error;
  return <Shell message={message || 'Connexion en cours…'} failed={Boolean(message)} />;
}

function Shell({ message, failed = false }: { message: string; failed?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-md sm:p-8">
        <p className={`text-sm ${failed ? 'text-rose-600' : 'text-slate-600'}`}>{message}</p>
        {failed && <Link href="/login" className="mt-4 inline-block text-sm font-medium text-[#0b3b60] hover:underline">Retour à la connexion</Link>}
      </section>
    </main>
  );
}
