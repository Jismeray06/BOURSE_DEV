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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800" />
          ))}
        </div>
      ) : establishments.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400"><HomeText contentKey="establishments.3" /></p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {establishments.map((establishment) => {
            const logo = logoSrc(establishment.logoUrl);
            return (
              <li key={establishment.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-[#06233b] via-[#0b3b60] to-blue-600">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white p-3 shadow-lg">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <EstablishmentIcon name={establishment.name} className="h-9 w-9 text-[#0b3b60]" />
                    )}
                  </span>
                </div>
                <p className="px-4 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">{establishment.name}</p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionShell>
  );
}
