'use client';

import Link from 'next/link';
import { HomeText } from './HomepageEditor';
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
          <p className="font-semibold text-slate-900 dark:text-white"><HomeText contentKey="bourse.1" />{' '}{campaign.academicYear} — <span>{STATUS_LABEL[campaign.status]}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {campaign.opensAt && <><HomeText contentKey="bourse.2" />{' '}{dateFormat.format(new Date(campaign.opensAt))}. </>}
            {campaign.closesAt && <><HomeText contentKey="bourse.3" />{' '}{dateFormat.format(new Date(campaign.closesAt))}. </>}
            {remaining !== null && <>{remaining}<HomeText contentKey="bourse.4" /></>}
          </p>
        </div>
      </div>
      {campaign.status === 'OUVERTE' && (
        <Link
          href={dashboardPath ?? REGISTER_PATH}
          className="inline-flex shrink-0 items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          style={{ backgroundColor: settings.primaryColor }}
        ><HomeText contentKey="bourse.5" /></Link>
      )}
    </div>
  );
}

export function BourseSection({ settings, campaign = null }: { settings: SiteSettings; campaign?: Campaign | null }) {
  return (
    <SectionShell
      id="bourse"
      title={<HomeText contentKey="bourse.6" />}
      description={<HomeText contentKey="bourse.7" />}
      tone="muted"
    >
      <div className="mx-auto max-w-4xl">
        {campaign && <CampaignBanner campaign={campaign} settings={settings} />}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-slate-900 dark:text-white"><HomeText contentKey="bourse.8" /></h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"><HomeText contentKey="bourse.9" /><strong className="font-semibold text-slate-800 dark:text-slate-200"><HomeText contentKey="bourse.10" /></strong><HomeText contentKey="bourse.11" /></p>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400"><HomeText contentKey="bourse.12" />{' '}
              <Link href={LOGIN_PATH} className="font-medium underline underline-offset-2 hover:no-underline" style={{ color: settings.primaryColor }}><HomeText contentKey="bourse.13" /></Link>{' '}<HomeText contentKey="bourse.14" /></p>
          </div>
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-6 dark:border-amber-400/30 dark:bg-amber-400/5">
            <h3 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg font-semibold text-slate-900 dark:text-white">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden /><HomeText contentKey="bourse.15" /></h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <li><HomeText contentKey="bourse.16" />{' '}<strong><HomeText contentKey="bourse.17" /></strong><HomeText contentKey="bourse.18" /></li>
              <li><HomeText contentKey="bourse.19" />{' '}<strong><HomeText contentKey="bourse.20" /></strong><HomeText contentKey="bourse.21" /></li>
              <li><HomeText contentKey="bourse.22" /></li>
            </ul>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
