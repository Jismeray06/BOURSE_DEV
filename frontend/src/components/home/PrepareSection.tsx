'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { REGISTER_PATH, useDashboardPath } from './useHomeSession';
import type { SiteSettings } from '../siteSettings';

const ITEMS = [
  'Une adresse e-mail accessible (un lien de vérification vous y sera envoyé)',
  'Votre établissement, votre niveau d\'études (L1 à M2) et votre parcours',
  'Le numéro de quitus délivré par votre établissement',
  "Une pièce d'identité (CIN) et un certificat de résidence",
  "Votre relevé de baccalauréat (obligatoire en première année)",
  "Les autres pièces demandées à l'étape « Pièces », en PDF, PNG ou JPG (10 Mo maximum chacune)",
];

export function PrepareSection({ settings }: { settings: SiteSettings }) {
  const dashboardPath = useDashboardPath();
  return (
    <SectionShell
      title="Préparez votre demande"
      description="Avant de commencer, assurez-vous de disposer des informations et documents nécessaires. Les éléments demandés peuvent dépendre de votre situation universitaire."
      tone="muted"
    >
      <div className="mx-auto max-w-3xl">
        <ul className="grid gap-3 sm:grid-cols-2">
          {ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          La liste définitive des pièces est affichée dans votre espace, à l&apos;étape « Pièces ». La pièce « attestation de chômage » est facultative.
        </p>
        <div className="mt-8 text-center">
          <Link
            href={dashboardPath ?? REGISTER_PATH}
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ backgroundColor: settings.primaryColor }}
          >
            Commencer ma demande
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}
