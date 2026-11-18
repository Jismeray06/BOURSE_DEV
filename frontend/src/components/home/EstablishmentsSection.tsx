'use client';

import { EstablishmentIcon, logoSrc, useEstablishments } from '../panels/establishments';
import { HomeText } from './HomepageEditor';
import { SectionShell } from './SectionShell';

// Largeur d'une carte selon l'écran : 2, 3, 4 puis 5 par ligne. La dernière ligne reste centrée (flex + justify-center).
const CARD_WIDTH =
  'w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)] xl:w-[calc(20%-0.8rem)]';

// « ISSTM (Institut Supérieur …) » : le sigle devient le titre, le nom complet passe en sous-titre.
function splitName(name: string) {
  const match = /^(.+?)\s*\((.+)\)\s*$/.exec(name.trim());
  return match ? { title: match[1], subtitle: match[2] } : { title: name, subtitle: '' };
}

// Les établissements viennent de l'API publique (GET /establishments) : la base reste la source de vérité.
export function EstablishmentsSection() {
  const { establishments, loaded } = useEstablishments();

  return (
    <SectionShell
      id="etablissements"
      tone="muted"
      eyebrow={<HomeText contentKey="establishments.4" />}
      title={<HomeText contentKey="establishments.1" />}
      description={<HomeText contentKey="establishments.2" />}
    >
      {!loaded ? (
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4" aria-busy="true">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className={`h-44 animate-pulse rounded-2xl bg-slate-300/60 dark:bg-slate-800 ${CARD_WIDTH}`} />
          ))}
        </div>
      ) : establishments.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400"><HomeText contentKey="establishments.3" /></p>
      ) : (
        <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {establishments.map((establishment, index) => {
            const logo = logoSrc(establishment.logoUrl);
            const { title, subtitle } = splitName(establishment.name);
            return (
              <li
                key={establishment.id}
                className={`group relative flex flex-col items-center rounded-2xl border border-slate-300 bg-white px-3 pb-5 pt-7 text-center transition-colors duration-200 hover:border-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 sm:px-4 ${CARD_WIDTH}`}
              >
                <span className="absolute left-4 top-3.5 text-[11px] font-semibold tabular-nums tracking-wider text-slate-400 dark:text-slate-500" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-3 sm:h-24 sm:w-24">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <EstablishmentIcon name={establishment.name} className="h-8 w-8 text-[#0b3b60]" />
                  )}
                </span>
                <p className="mt-4 text-balance text-sm font-bold leading-snug text-slate-900 dark:text-white sm:text-base">{title}</p>
                {subtitle && <p className="mt-1 line-clamp-3 text-balance text-xs leading-snug text-slate-500 dark:text-slate-400">{subtitle}</p>}
                <span className="mt-auto block pt-4" aria-hidden>
                  <span className="block h-0.5 w-8 rounded-full bg-slate-200 transition-all duration-200 group-hover:w-12 group-hover:bg-blue-600 dark:bg-slate-700 dark:group-hover:bg-blue-500" />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionShell>
  );
}
