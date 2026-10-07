import { SectionShell } from './SectionShell';
import type { Announcement } from './campaign';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

// Prêt à recevoir des annonces d'une future API. Sans annonce, la section n'est pas affichée.
export function AnnouncementsList({ announcements }: { announcements: Announcement[] }) {
  if (announcements.length === 0) return null;
  return (
    <SectionShell title="Actualités et informations importantes" tone="muted">
      <ul className="mx-auto grid max-w-4xl gap-4">
        {announcements.map((announcement) => (
          <li key={announcement.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <time dateTime={announcement.publishedAt} className="text-xs text-slate-500 dark:text-slate-400">
              {dateFormat.format(new Date(announcement.publishedAt))}
            </time>
            <h3 className="mt-1 font-[family-name:var(--font-heading)] text-base font-semibold text-slate-900 dark:text-white">{announcement.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{announcement.body}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
