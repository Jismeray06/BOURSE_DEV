'use client';

import { EstablishmentIcon, logoSrc, useEstablishments } from '../establishments';
import { HomeText } from './HomepageEditor';
import { SectionShell } from './SectionShell';

// Les établissements viennent de l'API publique (GET /establishments) : la base reste la source de vérité.
export function EstablishmentsSection() {
  const { establishments, loaded } = useEstablishments();

  return (
    <SectionShell
      id="etablissements"
      title={<HomeText contentKey="establishments.1" />}
      description={<HomeText contentKey="establishments.2" />}
      tone="muted"
    >
      {!loaded ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800" />
          ))}
        </div>
      ) : establishments.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400"><HomeText contentKey="establishments.3" /></p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {establishments.map((establishment) => {
            const logo = logoSrc(establishment.logoUrl);
            return (
              <li key={establishment.id} className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="h-12 w-12 rounded-lg object-contain" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-[#0b3b60] dark:bg-slate-800 dark:text-blue-300">
                    <EstablishmentIcon name={establishment.name} className="h-6 w-6" />
                  </span>
                )}
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{establishment.name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionShell>
  );
}
