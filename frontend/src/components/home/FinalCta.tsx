'use client';

import Link from 'next/link';
import type { SiteSettings } from '../siteSettings';
import { LOGIN_PATH, REGISTER_PATH, useDashboardPath } from './useHomeSession';

export function FinalCta({ settings }: { settings: SiteSettings }) {
  const dashboardPath = useDashboardPath();
  return (
    <section className="py-14 sm:py-16" style={{ backgroundColor: settings.primaryColor }}>
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white sm:text-3xl">Prêt à déposer votre demande ?</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
          Créez votre compte ou connectez-vous pour commencer votre démarche de demande de bourse nationale.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          {dashboardPath ? (
            <Link href={dashboardPath} className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-[#0b3b60] transition hover:brightness-95" style={{ backgroundColor: settings.secondaryColor }}>
              Accéder à mon espace
            </Link>
          ) : (
            <>
              <Link href={REGISTER_PATH} className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-[#0b3b60] transition hover:brightness-95" style={{ backgroundColor: settings.secondaryColor }}>
                Créer mon compte
              </Link>
              <Link href={LOGIN_PATH} className="inline-flex items-center justify-center rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Se connecter
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
