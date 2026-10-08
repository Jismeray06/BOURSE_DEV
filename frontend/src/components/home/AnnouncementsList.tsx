'use client';

import { Plus, Pencil, Trash2 } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { HomeText, useHomeEdit } from './HomepageEditor';
import { useHomepageContent } from './homepageStore';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
const iconButton = 'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800';

// Actualités publiées par l'administrateur (GET /homepage). Sans actualité, la section n'est pas affichée aux visiteurs.
export function AnnouncementsList() {
  const { news } = useHomepageContent();
  const { editMode, editNews, deleteNews } = useHomeEdit();
  if (news.length === 0 && !editMode) return null;
  return (
    <SectionShell id="actualites" title={<HomeText contentKey="announcements.1" />} tone="muted">
      {editMode && (
        <div className="mx-auto mb-4 flex max-w-4xl justify-end">
          <button type="button" onClick={() => editNews(null)} className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"><Plus className="h-4 w-4" aria-hidden />Ajouter</button>
        </div>
      )}
      {news.length === 0 && <p className="text-center text-sm text-slate-500 dark:text-slate-400">Aucune actualité pour le moment. Les visiteurs ne voient pas cette section tant qu’elle est vide.</p>}
      <ul className="mx-auto grid max-w-4xl gap-4">
        {news.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <time dateTime={item.publishedAt} className="text-xs text-slate-500 dark:text-slate-400">{dateFormat.format(new Date(item.publishedAt))}</time>
              {editMode && (
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => editNews(item)} aria-label={`Modifier l’actualité ${item.title}`} title="Modifier" className={iconButton}><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => deleteNews(item)} aria-label={`Supprimer l’actualité ${item.title}`} title="Supprimer" className={`${iconButton} hover:!border-rose-500/50 hover:!bg-rose-500/10 hover:text-rose-600`}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
            <h3 className="mt-1 font-[family-name:var(--font-heading)] text-base font-semibold text-slate-900 dark:text-white">{item.title}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
