'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ConfirmEmailChangePage() {
  return <Suspense fallback={<Shell message="Chargement…" />}><ConfirmContent /></Suspense>;
}

function ConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState(token ? 'Confirmation de votre nouvelle adresse e-mail…' : 'Le lien de confirmation est invalide ou incomplet.');
  const [done, setDone] = useState(false);
  // Le jeton est à usage unique : on ne l'envoie qu'une fois, même si l'effet est rejoué (mode strict).
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    void fetch(`${apiUrl}/account/email/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { message?: string | string[]; email?: string; userId?: string };
        if (!response.ok) throw new Error((Array.isArray(data.message) ? data.message[0] : data.message) || 'Ce lien de confirmation est invalide ou a expiré.');
        // Met à jour l'e-mail affiché si c'est la même personne qui est connectée dans ce navigateur.
        try {
          const stored = JSON.parse(sessionStorage.getItem('auth_user') ?? 'null') as { id?: string } | null;
          if (stored?.id && stored.id === data.userId) sessionStorage.setItem('auth_user', JSON.stringify({ ...stored, email: data.email }));
        } catch { /* session absente ou illisible */ }
        setDone(true);
        setMessage(`${data.message ?? 'Votre nouvelle adresse e-mail est confirmée.'} Utilisez-la désormais pour vous connecter.`);
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'La confirmation a échoué.'));
  }, [token]);

  return <Shell message={message} success={done} />;
}

function Shell({ message, success = false }: { message: string; success?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-md sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Nouvelle adresse e-mail</h1>
        <p className={`text-sm ${success ? 'text-emerald-700' : 'text-slate-600'}`}>{message}</p>
        <Link href="/login" className="inline-block text-sm font-medium text-blue-600 hover:underline">Aller à la connexion</Link>
      </section>
    </main>
  );
}
