'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, LogOut, Pencil, PencilRuler, TriangleAlert } from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';
import type { SiteSettings } from '../siteSettings';
import { CarouselModal, FieldsModal, SingleImageModal, type EditField } from './HomepageEditModals';
import { apiUrl, defaultContent, ensureHomepageLoaded, setHomepageContent, useHomepageContent, type HomeNews } from './homepageStore';

// Mode personnalisation de la page d'accueil : ouvert par un administrateur depuis son tableau de bord
// (/?mode=personnalisation). Hors de ce mode, aucun contrôle d'édition n'est rendu : les visiteurs voient la page finale.
// Les contrôles ne sont qu'une commodité : chaque modification est de toute façon refusée par le serveur si la session n'est pas ADMIN.
export const EDIT_MODE_QUERY = 'mode=personnalisation';
export const EDIT_MODE_PATH = `/?${EDIT_MODE_QUERY}`;
const MAX_HERO_IMAGES = 4;

export type HeroField = 'heroTitle' | 'heroSubtitle' | 'ctaSecondaryLabel';
const HERO_FIELDS: Record<HeroField, { title: string; label: string; max: number; multiline?: boolean }> = {
  heroTitle: { title: 'Modifier le titre', label: 'Titre', max: 160 },
  heroSubtitle: { title: 'Modifier le sous-titre', label: 'Sous-titre', max: 500, multiline: true },
  ctaSecondaryLabel: { title: 'Modifier le texte du bouton', label: 'Texte du bouton', max: 60 },
};
const CONTACT_FIELDS: EditField[] = [
  { id: 'contact.email', label: 'E-mail de la scolarité', value: '', maxLength: 120, type: 'text' },
  { id: 'contact.phone', label: 'Téléphone', value: '', maxLength: 40, type: 'text' },
  { id: 'contact.hours', label: 'Horaires d’ouverture', value: '', maxLength: 120, type: 'text' },
  { id: 'contact.address', label: 'Adresse', value: '', maxLength: 200, type: 'text' },
  { id: 'contact.supportEmail', label: 'E-mail de l’assistance technique', value: '', maxLength: 120, type: 'text' },
];
const SECTION_NAMES: Record<string, string> = {
  bourse: 'La bourse', steps: 'Comment ça marche', prepare: 'Préparer ma demande', benefits: 'Avantages', establishments: 'Établissements',
  statuses: 'Suivi du dossier', faq: 'FAQ', help: 'Besoin d’aide', 'final-cta': 'Appel à l’action', footer: 'Pied de page',
  announcements: 'Actualités', navbar: 'Barre de navigation', nav: 'Menu de navigation', hero: 'Bandeau d’accueil',
};

type Modal =
  | { kind: 'text'; key: string }
  | { kind: 'contact' }
  | { kind: 'hero'; field: HeroField }
  | { kind: 'news'; item: HomeNews | null }
  | { kind: 'carousel' }
  | { kind: 'logo' };
type Pending = { kind: 'news'; item: HomeNews } | { kind: 'image'; index: number };

type EditContext = {
  editMode: boolean;
  /** Faux : la page est présentée comme la voit un visiteur non connecté (boutons « Se connecter »…). */
  previewLoggedIn: boolean;
  editText: (key: string) => void;
  editContact: () => void;
  editHero: (field: HeroField) => void;
  editNews: (item: HomeNews | null) => void;
  deleteNews: (item: HomeNews) => void;
  editCarousel: () => void;
  editLogo: () => void;
};
const noop = () => undefined;
const inactive: EditContext = { editMode: false, previewLoggedIn: true, editText: noop, editContact: noop, editHero: noop, editNews: noop, deleteNews: noop, editCarousel: noop, editLogo: noop };
const EditCtx = createContext<EditContext>(inactive);

export const useHomeEdit = () => useContext(EditCtx);

const subscribeNothing = () => () => undefined;
const readSnapshot = () => {
  try {
    const wantsEdit = new URLSearchParams(window.location.search).get('mode') === 'personnalisation';
    return wantsEdit && Boolean(sessionStorage.getItem('auth_token')) && sessionStorage.getItem('user_role') === 'ADMIN' ? 'admin' : wantsEdit ? 'denied' : 'off';
  } catch { return 'off'; }
};

async function request<T>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${sessionStorage.getItem('auth_token') ?? ''}` };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { method: init.method ?? 'GET', headers, body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)) });
  } catch {
    throw new Error('Le serveur est injoignable. Vérifiez votre connexion et réessayez.');
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error('Votre session a expiré ou n’est pas autorisée. Reconnectez-vous en administrateur.');
    const data = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
    throw new Error(message || 'Impossible d’enregistrer la modification.');
  }
  return response.json() as Promise<T>;
}

const pencilCls = 'inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-blue-500/50 bg-white align-middle text-blue-600 shadow-sm transition hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-blue-500 dark:hover:text-white';

/** Petite icône crayon cliquable, visible uniquement en mode personnalisation. */
export function EditPencil({ label, onClick, className = '' }: { label: string; onClick: () => void; className?: string }) {
  const { editMode } = useHomeEdit();
  if (!editMode) return null;
  const activate = (event: { preventDefault: () => void; stopPropagation: () => void }) => { event.preventDefault(); event.stopPropagation(); onClick(); };
  return (
    <span
      role="button"
      tabIndex={0}
      title={label}
      aria-label={label}
      onClick={activate}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activate(event); }}
      className={`${pencilCls} ${className}`}
    >
      <Pencil className="h-3 w-3" aria-hidden />
    </span>
  );
}

/** Texte modifiable de la page d'accueil. Sans mode personnalisation, rend simplement le texte (aucun élément en plus). */
export function HomeText({ contentKey }: { contentKey: string }) {
  const { content } = useHomepageContent();
  const { editMode, editText } = useHomeEdit();
  useEffect(() => { ensureHomepageLoaded(); }, []);
  const text = content[contentKey] ?? defaultContent[contentKey] ?? '';
  if (!editMode) return <>{text}</>;
  return (
    <span className="rounded-sm outline-1 outline-offset-2 outline-dashed outline-blue-500/40 transition hover:outline-blue-500">
      {text}
      <EditPencil label="Modifier ce texte" onClick={() => editText(contentKey)} className="ml-1" />
    </span>
  );
}

/** Coordonnées de la scolarité et de l'assistance, modifiables depuis le mode personnalisation. */
export function useContactInfo() {
  const { content } = useHomepageContent();
  useEffect(() => { ensureHomepageLoaded(); }, []);
  return {
    scolarite: { email: content['contact.email'] ?? '', phone: content['contact.phone'] ?? '', hours: content['contact.hours'] ?? '', address: content['contact.address'] ?? '' },
    support: { email: content['contact.supportEmail'] ?? '' },
  };
}

type ProviderProps = { settings: SiteSettings; onSettingsChange: (settings: SiteSettings) => void; children: ReactNode };

/** À placer autour de la page d'accueil : active le mode personnalisation pour un administrateur authentifié. */
export function HomeEditProvider({ settings, onSettingsChange, children }: ProviderProps) {
  const router = useRouter();
  const access = useSyncExternalStore(subscribeNothing, readSnapshot, () => 'off');
  const [verified, setVerified] = useState(false);
  const [previewLoggedIn, setPreviewLoggedIn] = useState(false);
  const [modal, setModal] = useState<Modal | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const deleting = useRef(false);
  const { content } = useHomepageContent();
  const editMode = access === 'admin' && verified;

  // Le serveur confirme que la session est bien celle d'un administrateur ; sinon on revient à la page publique.
  useEffect(() => {
    if (access === 'denied') { router.replace('/'); return; }
    if (access !== 'admin') return;
    let cancelled = false;
    request<{ content: Record<string, string>; news: HomeNews[] }>('/admin/homepage')
      .then((data) => { if (!cancelled) { setHomepageContent(data); setVerified(true); } })
      .catch(() => { if (!cancelled) router.replace('/'); });
    return () => { cancelled = true; };
  }, [access, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const succeed = useCallback((text = 'Modification enregistrée avec succès.') => { setModal(null); setToast({ text, error: false }); }, []);
  const fail = (error: unknown) => setToast({ text: error instanceof Error ? error.message : 'Une erreur est survenue.', error: true });

  const saveContent = async (values: Record<string, string | null>) => {
    setHomepageContent(await request('/admin/homepage/content', { method: 'PATCH', body: values }));
  };
  const saveNews = async (item: HomeNews | null, values: Record<string, string>) => {
    const body = { title: values.title, body: values.body, publishedAt: values.publishedAt ? new Date(`${values.publishedAt}T12:00:00`).toISOString() : undefined };
    setHomepageContent(await request(item ? `/admin/homepage/news/${item.id}` : '/admin/homepage/news', { method: item ? 'PATCH' : 'POST', body }));
  };
  const upload = async (path: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<SiteSettings>(path, { method: 'POST', form });
  };

  const confirmDelete = async () => {
    if (!pending || deleting.current) return;
    deleting.current = true;
    try {
      if (pending.kind === 'news') {
        setHomepageContent(await request(`/admin/homepage/news/${pending.item.id}`, { method: 'DELETE' }));
        setToast({ text: 'Actualité supprimée.', error: false });
      } else {
        const row = await request<SiteSettings>(`/admin/site-settings/hero-images/${pending.index}`, { method: 'DELETE' });
        onSettingsChange({ ...settings, heroBackgroundImages: row.heroBackgroundImages });
        setToast({ text: 'Image supprimée.', error: false });
      }
    } catch (error) { fail(error); } finally { deleting.current = false; setPending(null); }
  };

  const context: EditContext = {
    editMode,
    previewLoggedIn,
    editText: (key) => setModal({ kind: 'text', key }),
    editContact: () => setModal({ kind: 'contact' }),
    editHero: (field) => setModal({ kind: 'hero', field }),
    editNews: (item) => setModal({ kind: 'news', item }),
    deleteNews: (item) => setPending({ kind: 'news', item }),
    editCarousel: () => setModal({ kind: 'carousel' }),
    editLogo: () => setModal({ kind: 'logo' }),
  };

  const close = () => setModal(null);
  let dialog: ReactNode = null;
  if (editMode && modal?.kind === 'text') {
    const original = defaultContent[modal.key] ?? '';
    const section = SECTION_NAMES[modal.key.split('.')[0]];
    dialog = (
      <FieldsModal
        title={section ? `Modifier le texte — ${section}` : 'Modifier le texte'}
        fields={[{ id: modal.key, label: 'Texte', value: content[modal.key] ?? original, original, required: true, maxLength: 1000 }]}
        onClose={close}
        onSave={async (values) => { await saveContent({ [modal.key]: values[modal.key] === original ? null : values[modal.key] }); succeed(); }}
      />
    );
  } else if (editMode && modal?.kind === 'contact') {
    dialog = (
      <FieldsModal
        title="Modifier les coordonnées"
        fields={CONTACT_FIELDS.map((field) => ({ ...field, value: content[field.id] ?? '', original: defaultContent[field.id] }))}
        onClose={close}
        onSave={async (values) => { await saveContent(values); succeed(); }}
      />
    );
  } else if (editMode && modal?.kind === 'hero') {
    const { field } = modal;
    const spec = HERO_FIELDS[field];
    dialog = (
      <FieldsModal
        title={spec.title}
        fields={[{ id: field, label: spec.label, value: settings[field], type: spec.multiline ? 'textarea' : 'text', required: true, maxLength: spec.max }]}
        onClose={close}
        onSave={async (values) => {
          const row = await request<SiteSettings>('/admin/homepage/hero', { method: 'PATCH', body: { [field]: values[field] } });
          onSettingsChange({ ...settings, heroTitle: row.heroTitle, heroSubtitle: row.heroSubtitle, ctaSecondaryLabel: row.ctaSecondaryLabel });
          succeed();
        }}
      />
    );
  } else if (editMode && modal?.kind === 'news') {
    const { item } = modal;
    dialog = (
      <FieldsModal
        title={item ? 'Modifier l’actualité' : 'Ajouter une actualité'}
        fields={[
          { id: 'title', label: 'Titre', value: item?.title ?? '', required: true, maxLength: 150, type: 'text' },
          { id: 'body', label: 'Texte', value: item?.body ?? '', required: true, maxLength: 2000, type: 'textarea' },
          { id: 'publishedAt', label: 'Date de publication', value: (item?.publishedAt ?? new Date().toISOString()).slice(0, 10), required: true, type: 'date' },
        ]}
        onClose={close}
        onSave={async (values) => { await saveNews(item, values); succeed(item ? 'Actualité modifiée avec succès.' : 'Actualité ajoutée avec succès.'); }}
      />
    );
  } else if (editMode && modal?.kind === 'logo') {
    dialog = (
      <SingleImageModal
        title="Modifier le logo"
        current={settings.logoUrl}
        onClose={close}
        onSave={async (file) => {
          const row = await upload('/admin/site-settings/upload/logo', file);
          onSettingsChange({ ...settings, logoUrl: row.logoUrl });
          succeed('Logo enregistré avec succès.');
        }}
      />
    );
  } else if (editMode && modal?.kind === 'carousel') {
    dialog = (
      <CarouselModal
        images={settings.heroBackgroundImages}
        max={MAX_HERO_IMAGES}
        backgroundIsImage={settings.heroBackgroundType === 'IMAGE'}
        onClose={close}
        onRemove={(index) => setPending({ kind: 'image', index })}
        onAdd={async (file) => {
          const row = await upload('/admin/site-settings/hero-images', file);
          onSettingsChange({ ...settings, heroBackgroundImages: row.heroBackgroundImages });
          setToast({ text: 'Image ajoutée au carrousel.', error: false });
        }}
      />
    );
  }

  return (
    <EditCtx.Provider value={context}>
      {children}
      {editMode && (
        <>
          <div aria-hidden className="h-16" />
          <div role="region" aria-label="Mode personnalisation" className="fixed inset-x-0 bottom-0 z-50 border-t border-blue-500/40 bg-slate-900 text-white shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
              <p className="flex min-w-0 items-center gap-2 text-xs font-bold sm:text-sm"><PencilRuler className="h-4 w-4 shrink-0 text-blue-400" aria-hidden />Mode personnalisation de la page d’accueil</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewLoggedIn((value) => !value)}
                  aria-pressed={previewLoggedIn}
                  title="Les boutons changent selon que le visiteur est connecté ou non"
                  className="hidden min-h-[40px] items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-200 transition hover:border-blue-500/60 hover:text-white sm:inline-flex"
                >
                  <Eye className="h-4 w-4" aria-hidden />{previewLoggedIn ? 'Vue : utilisateur connecté' : 'Vue : visiteur'}
                </button>
                <button type="button" onClick={() => router.push('/admin')} className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-700">
                  <LogOut className="h-4 w-4" aria-hidden />Quitter la personnalisation
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {dialog}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'news' ? 'Supprimer l’actualité' : 'Supprimer l’image'}
        message="Voulez-vous vraiment supprimer cet élément ?"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => void confirmDelete()}
        onCancel={() => { if (!deleting.current) setPending(null); }}
      />
      {toast && (
        <div role={toast.error ? 'alert' : 'status'} className={`fixed bottom-20 left-1/2 z-[65] flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl ${toast.error ? 'border-rose-500/40 bg-rose-950 text-rose-100' : 'border-emerald-500/40 bg-emerald-950 text-emerald-100'}`}>
          {toast.error ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
          <span>{toast.error ? toast.text : `✓ ${toast.text}`}</span>
        </div>
      )}
    </EditCtx.Provider>
  );
}
