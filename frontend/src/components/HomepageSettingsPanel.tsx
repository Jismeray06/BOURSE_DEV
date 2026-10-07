'use client';

import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Palette, RotateCcw, Save, Type, Upload, X } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { HeroBackground, HeroContent } from './HomepageHero';
import { assetUrl, defaultSiteSettings, fetchSiteSettings, type HeroBackgroundType, type SiteSettings } from './siteSettings';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const getToken = () => sessionStorage.getItem('auth_token');
const fieldCls = 'AccountInput w-full text-base sm:text-sm max-[1024px]:min-h-[44px]';
const touch = 'max-[1024px]:min-h-[44px]';

type SubTab = 'branding' | 'background' | 'texts';

export function HomepageSettingsPanel() {
  const [draft, setDraft] = useState<SiteSettings>(defaultSiteSettings);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('branding');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setDraft(await fetchSiteSettings());
      setLoading(false);
    };
    void load();
  }, []);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMessage('');
    const { primaryColor, secondaryColor, backgroundColor, heroBackgroundType, heroOverlayOpacity, heroTitle, heroSubtitle, ctaPrimaryLabel, ctaPrimaryLink, ctaSecondaryLabel, ctaSecondaryLink } = draft;
    const response = await fetch(`${apiUrl}/admin/site-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ primaryColor, secondaryColor, backgroundColor, heroBackgroundType, heroOverlayOpacity, heroTitle, heroSubtitle, ctaPrimaryLabel, ctaPrimaryLink, ctaSecondaryLabel, ctaSecondaryLink }),
    });
    if (response.ok) { setDraft(await response.json()); setMessage('Modifications enregistrées.'); }
    else setMessage('Impossible d’enregistrer les modifications.');
    setSaving(false);
  };

  const upload = async (asset: 'logo' | 'favicon', file: File | undefined) => {
    if (!file) return;
    setUploading(asset);
    setMessage('');
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${apiUrl}/admin/site-settings/upload/${asset}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    if (response.ok) setDraft(await response.json());
    else setMessage('Le téléversement a échoué (PNG, JPG ou SVG, 5 Mo max).');
    setUploading(null);
  };

  const addHeroImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading('heroImage');
    setMessage('');
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${apiUrl}/admin/site-settings/hero-images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    if (response.ok) setDraft(await response.json());
    else setMessage('Le téléversement a échoué (PNG ou JPG, 5 Mo max, 4 photos maximum).');
    setUploading(null);
  };

  const removeHeroImage = async (index: number) => {
    setMessage('');
    const response = await fetch(`${apiUrl}/admin/site-settings/hero-images/${index}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (response.ok) setDraft(await response.json());
    else setMessage('Impossible de supprimer cette photo.');
  };

  const reset = async () => {
    setResetConfirmOpen(false);
    setSaving(true);
    setMessage('');
    const response = await fetch(`${apiUrl}/admin/site-settings/reset`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (response.ok) { setDraft(await response.json()); setMessage('Réglages réinitialisés par défaut.'); }
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-slate-400">Chargement…</p>;

  const subTabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'branding', label: 'Branding & Visuel', icon: <Palette className="h-4 w-4" /> },
    { id: 'background', label: 'Arrière-plan & Hero', icon: <ImageIcon className="h-4 w-4" /> },
    { id: 'texts', label: 'Textes & Boutons', icon: <Type className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <p className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-200">
        Ces réglages sont enregistrés sur le serveur et s’appliquent à la page d’accueil publique pour tous les visiteurs.
      </p>
      {message && <p className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-3 text-sm text-slate-200">{message}</p>}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-2">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={subTab === tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${touch} ${subTab === tab.id ? 'border-blue-500/40 bg-blue-600 text-white' : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <section className="min-w-0 space-y-5 rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
          {subTab === 'branding' && (
            <>
              <AssetUploadRow
                label="Logo"
                hint="Affiché dans l’en-tête à la place de l’icône par défaut. PNG, JPG ou SVG."
                previewUrl={assetUrl(draft.logoUrl)}
                uploading={uploading === 'logo'}
                inputRef={logoInputRef}
                onSelect={(file) => void upload('logo', file)}
              />
              <AssetUploadRow
                label="Favicon"
                hint="Icône affichée dans l’onglet du navigateur. PNG, JPG ou SVG."
                previewUrl={assetUrl(draft.faviconUrl)}
                uploading={uploading === 'favicon'}
                inputRef={faviconInputRef}
                onSelect={(file) => void upload('favicon', file)}
              />
              <ColorField label="Couleur primaire" value={draft.primaryColor} onChange={(value) => set('primaryColor', value)} />
              <ColorField label="Couleur secondaire" value={draft.secondaryColor} onChange={(value) => set('secondaryColor', value)} />
              <ColorField label="Couleur de fond" value={draft.backgroundColor} onChange={(value) => set('backgroundColor', value)} />
            </>
          )}

          {subTab === 'background' && (
            <>
              <Field label="Type de fond du hero">
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'COLOR', label: 'Couleur unie' },
                    { value: 'GRADIENT', label: 'Dégradé' },
                    { value: 'IMAGE', label: 'Image' },
                  ] as { value: HeroBackgroundType; label: string }[]).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={draft.heroBackgroundType === option.value}
                      onClick={() => set('heroBackgroundType', option.value)}
                      className={`min-w-[7rem] flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${touch} ${draft.heroBackgroundType === option.value ? 'border-blue-500/40 bg-blue-600 text-white' : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-blue-500/50'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>
              {draft.heroBackgroundType === 'IMAGE' && (
                <HeroImagesUploader
                  images={draft.heroBackgroundImages}
                  uploading={uploading === 'heroImage'}
                  onAdd={(file) => void addHeroImage(file)}
                  onRemove={(index) => void removeHeroImage(index)}
                />
              )}
              <Field label={`Opacité du filtre d’arrière-plan (${draft.heroOverlayOpacity}%)`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draft.heroOverlayOpacity}
                  onChange={(event) => set('heroOverlayOpacity', Number(event.target.value))}
                  className="w-full accent-blue-600"
                />
              </Field>
            </>
          )}

          {subTab === 'texts' && (
            <>
              <Field label="Titre principal">
                <input value={draft.heroTitle} onChange={(event) => set('heroTitle', event.target.value)} className={fieldCls} />
              </Field>
              <Field label="Sous-titre">
                <textarea value={draft.heroSubtitle} onChange={(event) => set('heroSubtitle', event.target.value)} rows={3} className={fieldCls} />
              </Field>
              <Field label="Bouton de l’en-tête — texte">
                <input value={draft.ctaPrimaryLabel} onChange={(event) => set('ctaPrimaryLabel', event.target.value)} className={fieldCls} />
              </Field>
              <Field label="Bouton de l’en-tête — lien">
                <input value={draft.ctaPrimaryLink} onChange={(event) => set('ctaPrimaryLink', event.target.value)} placeholder="/login" className={fieldCls} />
              </Field>
              <Field label="Bouton principal du hero — texte">
                <input value={draft.ctaSecondaryLabel} onChange={(event) => set('ctaSecondaryLabel', event.target.value)} className={fieldCls} />
              </Field>
              <Field label="Bouton principal du hero — lien">
                <input value={draft.ctaSecondaryLink} onChange={(event) => set('ctaSecondaryLink', event.target.value)} placeholder="/login" className={fieldCls} />
              </Field>
            </>
          )}
        </section>

        <section className="relative min-h-[420px] min-w-0 overflow-hidden rounded-3xl border border-slate-800/80 bg-[#06233b] p-4 sm:p-6">
          <p className="absolute left-4 top-4 z-10 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:left-6 sm:top-6">Aperçu en direct</p>
          <HeroBackground settings={draft} />
          {draft.heroBackgroundType === 'IMAGE' && !draft.heroBackgroundImages.length && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 px-6 text-center text-xs text-slate-400">
              Carrousel de campus par défaut (téléversez au moins une photo pour le remplacer)
            </div>
          )}
          <div className="relative z-10 flex h-full items-center py-10">
            <HeroContent settings={draft} primary={{ label: draft.ctaSecondaryLabel, onClick: () => undefined }} secondary={{ label: 'Suivre ma demande', onClick: () => undefined }} />
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
        <button
          type="button"
          onClick={() => setResetConfirmOpen(true)}
          className={`flex items-center gap-2 rounded-xl border border-rose-500/30 px-3.5 py-2.5 text-xs font-bold text-rose-300 ${touch}`}
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser par défaut
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className={`ml-auto flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 ${touch}`}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Réinitialiser la page d’accueil"
        message="Les couleurs, textes, boutons et images personnalisés seront remplacés par les valeurs par défaut. Cette action est irréversible."
        confirmLabel="Réinitialiser"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => void reset()}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-300">{label}</p>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent p-0.5" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className={fieldCls} />
      </div>
    </Field>
  );
}

function HeroImagesUploader({
  images,
  uploading,
  onAdd,
  onRemove,
}: {
  images: string[];
  uploading: boolean;
  onAdd: (file: File | undefined) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const maxImages = 4;

  return (
    <Field label={`Photos de fond (${images.length}/${maxImages})`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: maxImages }).map((_, index) => {
          const url = assetUrl(images[index] ?? null);
          const isNextSlot = index === images.length;
          return (
            <div key={index} className="relative aspect-video overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              {url ? (
                <>
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Supprimer cette photo"
                    onClick={() => onRemove(index)}
                    className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-white hover:bg-rose-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : isNextSlot ? (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-500 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-[10px] font-semibold">{uploading ? 'Envoi…' : 'Ajouter'}</span>
                </button>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-700">
                  <ImageIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(event) => { onAdd(event.target.files?.[0]); event.target.value = ''; }}
      />
      <p className="mt-2 text-[11px] text-slate-500">
        1 photo = fond fixe. 2 à {maxImages} photos = diaporama automatique. PNG ou JPG, 5 Mo max chacune.
      </p>
    </Field>
  );
}

function AssetUploadRow({
  label,
  hint,
  previewUrl,
  uploading,
  inputRef,
  onSelect,
  accept = 'image/png,image/jpeg,image/svg+xml',
}: {
  label: string;
  hint: string;
  previewUrl: string | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (file: File | undefined) => void;
  accept?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
          {previewUrl ? <img src={previewUrl} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-5 w-5 text-slate-600" />}
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={`flex items-center gap-2 rounded-xl border border-slate-700 px-3.5 py-2.5 text-xs font-bold text-slate-300 disabled:opacity-50 ${touch}`}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Envoi…' : 'Téléverser'}
          </button>
          <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>
        </div>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => { onSelect(event.target.files?.[0]); event.target.value = ''; }} />
      </div>
    </Field>
  );
}
