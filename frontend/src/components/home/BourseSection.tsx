'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarDays } from 'lucide-react';
import { SectionShell } from './SectionShell';
import type { Campaign, CampaignStatus } from './campaign';
import { LOGIN_PATH, REGISTER_PATH, useDashboardPath } from './useHomeSession';
import type { SiteSettings } from '../siteSettings';

const STATUS_LABEL: Record<CampaignStatus, string> = { A_VENIR: 'À venir', OUVERTE: 'Ouverte', CLOTUREE: 'Clôturée' };
const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

function daysLeft(closesAt: string | null) {
  if (!closesAt) return null;
  const days = Math.ceil((new Date(closesAt).getTime() - Date.now()) / 86_400_000);
  return days >= 0 ? days : null;
}

// Bandeau de campagne : n'affiche rien tant qu'aucune campagne n'est fournie (aucune API n'existe encore).
function CampaignBanner({ campaign, settings }: { campaign: Campaign; settings: SiteSettings }) {
  const remaining = campaign.status === 'OUVERTE' ? daysLeft(campaign.closesAt) : null;
  const dashboardPath = useDashboardPath();
  return (
    <div className="mb-8 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">
            Campagne de bourse {campaign.academicYear} — <span>{STATUS_LABEL[campaign.status]}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {campaign.opensAt && <>Ouverture : {dateFormat.format(new Date(campaign.opensAt))}. </>}
            {campaign.closesAt && <>Clôture : {dateFormat.format(new Date(campaign.closesAt))}. </>}
            {remaining !== null && <>{remaining} jour(s) restant(s).</>}
          </p>
        </div>
      </div>
      {campaign.status === 'OUVERTE' && (
        <Link
          href={dashboardPath ?? REGISTER_PATH}
          className="inline-flex shrink-0 items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          style={{ backgroundColor: settings.primaryColor }}
        >
          Déposer ma demande
        </Link>
      )}
    </div>
  );
}

export function BourseSection({ settings, campaign = null }: { settings: SiteSettings; campaign?: Campaign | null }) {
  return (
    <SectionShell
      id="bourse"
      title="La demande de bourse en ligne"
      description="Cette plateforme permet aux étudiants de l'Université de Mahajanga de déposer leur dossier de demande de bourse, de joindre leurs pièces justificatives et d'en suivre l'examen par la scolarité centrale."
      tone="muted"
    >
      <div className="mx-auto max-w-4xl">
        {campaign && <CampaignBanner campaign={campaign} settings={settings} />}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-slate-900 dark:text-white">Qui peut l&apos;utiliser ?</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Tout étudiant d&apos;un établissement de l&apos;Université de Mahajanga qui souhaite demander une bourse. Le dépôt s&apos;appuie sur
              un <strong className="font-semibold text-slate-800 dark:text-slate-200">quitus</strong> : un code de reçu délivré par votre
              établissement, que vous saisissez pour authentifier votre dossier.
            </p>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Déjà un compte ?{' '}
              <Link href={LOGIN_PATH} className="font-medium underline underline-offset-2 hover:no-underline" style={{ color: settings.primaryColor }}>Connectez-vous</Link>{' '}
              pour reprendre votre dossier.
            </p>
          </div>
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-6 dark:border-amber-400/30 dark:bg-amber-400/5">
            <h3 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg font-semibold text-slate-900 dark:text-white">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              À savoir avant de déposer
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <li>L&apos;attribution d&apos;une bourse n&apos;est <strong>pas automatique</strong> : elle dépend des critères en vigueur pour l&apos;année universitaire et des décisions de la Commission de bourses.</li>
              <li>Les nouveaux étudiants inscrits en première année avec un baccalauréat antérieur <strong>ne sont pas éligibles</strong> et ne doivent pas soumettre de demande.</li>
              <li>Tout dossier incomplet ne sera pas pris en compte.</li>
            </ul>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
