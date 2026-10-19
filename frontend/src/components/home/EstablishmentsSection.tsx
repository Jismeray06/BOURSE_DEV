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
      eyebrow={<HomeText contentKey="establishments.4" />}
      title={<HomeText contentKey="establishments.1" />}
      description={<HomeText contentKey="establishments.2" />}
    >
      {!loaded ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800" />
          ))}
        </div>
      ) : establishments.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400"><HomeText contentKey="establishments.3" /></p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {establishments.map((establishment) => {
            const logo = logoSrc(establishment.logoUrl);
            return (
              <li key={establishment.id} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-2">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <EstablishmentIcon name={establishment.name} className="h-6 w-6 text-[#0b3b60]" />
                  )}
                </span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{establishment.name}</p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionShell>
  );
}
