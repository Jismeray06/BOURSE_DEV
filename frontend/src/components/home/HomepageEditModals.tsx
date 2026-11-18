'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bold, ImagePlus, Italic, Loader2, RotateCcw, Trash2, Underline, X } from 'lucide-react';
import { assetUrl } from './siteSettings';
import { COLOR_SWATCHES, FONT_OPTIONS, SIZE_OPTIONS, cleanStyle, isEmptyStyle, styleToCss, type TextFont, type TextSize, type TextStyle } from './textStyle';

const fieldCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:text-sm';
const primaryBtn = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryBtn = 'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800';

export type EditField = {
  id: string;
  label: string;
  value: string;
  type?: 'text' | 'textarea' | 'date';
  maxLength?: number;
  required?: boolean;
  /** Texte d'origine : permet de proposer « Rétablir le texte d'origine ». */
  original?: string;
};

function ModalShell({ title, onClose, busy, children }: { title: string; onClose: () => void; busy: boolean; children: ReactNode }) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center">
      <section role="dialog" aria-modal="true" aria-label={title} className="my-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

// Vrai si la couleur est très claire : l'aperçu passe alors sur fond sombre pour que le texte reste lisible.
const isLightColor = (hex: string | undefined) => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 200;
};
const toggleCls = (active: boolean) => `inline-flex h-10 min-w-[2.5rem] items-center justify-center gap-1 rounded-lg border px-3 text-xs font-semibold transition ${active ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`;

/** Choix de la couleur, de la police, de la taille et du gras / italique / souligné, avec aperçu en direct. */
function StylePanel({ style, onChange, sample, disabled }: { style: TextStyle; onChange: (style: TextStyle) => void; sample: string; disabled: boolean }) {
  const patch = (change: Partial<TextStyle>) => onChange({ ...style, ...change });
  const label = 'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300';
  return (
    <fieldset disabled={disabled} className="space-y-4 rounded-2xl border border-orange-500/40 bg-orange-500/5 p-4">
      <legend className="px-2 text-xs font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300">Mise en forme</legend>

      <div>
        <span className={label}>Couleur du texte</span>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => patch({ color: undefined })} aria-pressed={!style.color} className={toggleCls(!style.color)}>Couleur d’origine</button>
          {COLOR_SWATCHES.map((color) => (
            <button key={color} type="button" title={color} aria-label={`Couleur ${color}`} aria-pressed={style.color === color} onClick={() => patch({ color })} style={{ backgroundColor: color }} className={`h-8 w-8 rounded-full border-2 transition hover:scale-110 ${style.color === color ? 'border-orange-500' : 'border-slate-300 dark:border-slate-600'}`} />
          ))}
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <input type="color" value={style.color ?? '#2563eb'} onChange={(event) => patch({ color: event.target.value })} aria-label="Couleur personnalisée" className="h-8 w-10 cursor-pointer rounded-lg border border-slate-300 bg-transparent p-0.5 dark:border-slate-600" />
            Autre
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="home-style-font" className={label}>Police</label>
        <select id="home-style-font" value={style.font ?? ''} onChange={(event) => patch({ font: (event.target.value || undefined) as TextFont | undefined })} className={fieldCls}>
          {FONT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div>
        <span className={label}>Taille</span>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((option) => (
            <button key={option.value || 'normal'} type="button" aria-pressed={(style.size ?? '') === option.value} onClick={() => patch({ size: (option.value || undefined) as TextSize | undefined })} className={toggleCls((style.size ?? '') === option.value)}>{option.label}</button>
          ))}
        </div>
      </div>

      <div>
        <span className={label}>Style</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={Boolean(style.bold)} onClick={() => patch({ bold: !style.bold })} className={toggleCls(Boolean(style.bold))}><Bold className="h-4 w-4" aria-hidden />Gras</button>
          <button type="button" aria-pressed={Boolean(style.italic)} onClick={() => patch({ italic: !style.italic })} className={toggleCls(Boolean(style.italic))}><Italic className="h-4 w-4" aria-hidden />Italique</button>
          <button type="button" aria-pressed={Boolean(style.underline)} onClick={() => patch({ underline: !style.underline })} className={toggleCls(Boolean(style.underline))}><Underline className="h-4 w-4" aria-hidden />Souligné</button>
        </div>
      </div>

      <div>
        <span className={label}>Aperçu</span>
        <p className={`max-h-32 overflow-auto rounded-xl border border-slate-300 px-3 py-3 text-base leading-snug dark:border-slate-700 ${isLightColor(style.color) ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-800'}`}>
          <span style={styleToCss(style)}>{sample || 'Texte d’exemple'}</span>
        </p>
      </div>

      {!isEmptyStyle(style) && (
        <button type="button" onClick={() => onChange({})} className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:underline dark:text-orange-300"><RotateCcw className="h-3.5 w-3.5" aria-hidden />Rétablir la mise en forme d’origine</button>
      )}
    </fieldset>
  );
}

// Formulaire d'édition générique (un ou plusieurs champs texte) avec validation, état de chargement et erreurs.
// Avec `initialStyle`, il propose aussi la mise en forme du texte (couleur, police, taille…) et la transmet à `onSave`.
export function FieldsModal({ title, fields, onSave, onClose, initialStyle }: { title: string; fields: EditField[]; onSave: (values: Record<string, string>, style: TextStyle) => Promise<void>; onClose: () => void; initialStyle?: TextStyle }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.id, field.value])));
  const [style, setStyle] = useState<TextStyle>(() => cleanStyle(initialStyle ?? {}));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const submit = async () => {
    if (submitting.current) return; // empêche les doubles soumissions
    for (const field of fields) {
      const value = (values[field.id] ?? '').trim();
      if (field.required && !value) { setError(`${field.label} : ce champ est obligatoire.`); return; }
      if (field.maxLength && value.length > field.maxLength) { setError(`${field.label} : ${field.maxLength} caractères maximum.`); return; }
    }
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave(Object.fromEntries(fields.map((field) => [field.id, (values[field.id] ?? '').trim()])), cleanStyle(style));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Impossible d’enregistrer la modification.');
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <ModalShell title={title} onClose={onClose} busy={saving}>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-4">
        {fields.map((field, index) => {
          const id = `home-edit-${field.id}`;
          const current = values[field.id] ?? '';
          const set = (value: string) => setValues((previous) => ({ ...previous, [field.id]: value }));
          return (
            <div key={field.id}>
              <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">{field.label}</label>
              {field.type === 'textarea' || (!field.type && field.value.length > 80) ? (
                <textarea id={id} value={current} onChange={(event) => set(event.target.value)} disabled={saving} rows={5} autoFocus={index === 0} maxLength={field.maxLength} className={`${fieldCls} resize-y`} />
              ) : (
                <input id={id} type={field.type === 'date' ? 'date' : 'text'} value={current} onChange={(event) => set(event.target.value)} disabled={saving} autoFocus={index === 0} maxLength={field.maxLength} className={fieldCls} />
              )}
              <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                {field.original !== undefined && current !== field.original ? (
                  <button type="button" disabled={saving} onClick={() => set(field.original ?? '')} className="font-semibold text-blue-600 hover:underline disabled:opacity-60 dark:text-blue-400">Rétablir le texte d’origine</button>
                ) : <span />}
                {field.maxLength && field.type !== 'date' && <span>{current.length}/{field.maxLength}</span>}
              </div>
            </div>
          );
        })}
        {initialStyle !== undefined && <StylePanel style={style} onChange={setStyle} sample={(values[fields[0]?.id] ?? '').trim()} disabled={saving} />}
        {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300">{error}</p>}
        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className={secondaryBtn}>Annuler</button>
          <button type="submit" disabled={saving} className={primaryBtn}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Choix d'un fichier image avec contrôle du format et de la taille, et aperçu avant enregistrement.
function useImageChoice(accepted: string[], formatsLabel: string) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choose = (selected: File | undefined) => {
    if (!selected) return;
    if (!accepted.includes(selected.type)) { setError(`Format accepté : ${formatsLabel}.`); return; }
    if (selected.size > MAX_IMAGE_SIZE) { setError('Le fichier ne doit pas dépasser 5 Mo.'); return; }
    setError('');
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };
  const clear = () => { setFile(null); setPreview(null); setError(''); };
  return { file, preview, error, setError, choose, clear };
}

function FilePicker({ label, accept, disabled, onPick }: { label: string; accept: string; disabled: boolean; onPick: (file: File | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={input} type="file" accept={accept} className="hidden" onChange={(event) => { onPick(event.target.files?.[0]); event.target.value = ''; }} />
      <button type="button" disabled={disabled} onClick={() => input.current?.click()} className={secondaryBtn}><ImagePlus className="mr-2 h-4 w-4" />{label}</button>
    </>
  );
}

/** Remplacement d'une image unique (ex. logo) : image actuelle, nouvel aperçu, enregistrement. */
export function SingleImageModal({ title, current, onSave, onClose }: { title: string; current: string | null; onSave: (file: File) => Promise<void>; onClose: () => void }) {
  const choice = useImageChoice(['image/png', 'image/jpeg', 'image/svg+xml'], 'PNG, JPG ou SVG');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const submit = async () => {
    if (!choice.file || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try { await onSave(choice.file); } catch (failure) {
      choice.setError(failure instanceof Error ? failure.message : 'Impossible d’enregistrer l’image.');
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <ModalShell title={title} onClose={onClose} busy={saving}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Preview label="Image actuelle" src={current ? assetUrl(current) : null} empty="Icône par défaut" />
        <Preview label="Nouvelle image" src={choice.preview} empty="Aucune sélection" />
      </div>
      {choice.error && <p role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300">{choice.error}</p>}
      <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">PNG, JPG ou SVG — 5 Mo maximum. L’ancienne image est supprimée à l’enregistrement.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <FilePicker label="Choisir une nouvelle image" accept="image/png,image/jpeg,image/svg+xml" disabled={saving} onPick={choice.choose} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" onClick={onClose} disabled={saving} className={secondaryBtn}>Annuler</button>
          <button type="button" onClick={() => void submit()} disabled={saving || !choice.file} className={primaryBtn}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </ModalShell>
  );
}

function Preview({ label, src, empty }: { label: string; src: string | null; empty: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" className="h-full w-full object-contain" /> : <span className="px-2 text-center text-xs text-slate-500 dark:text-slate-400">{empty}</span>}
      </div>
    </div>
  );
}

/** Images du carrousel : liste des photos personnalisées, suppression et ajout avec aperçu. */
export function CarouselModal({ images, max, backgroundIsImage, onAdd, onRemove, onClose }: { images: string[]; max: number; backgroundIsImage: boolean; onAdd: (file: File) => Promise<void>; onRemove: (index: number) => void; onClose: () => void }) {
  const choice = useImageChoice(['image/png', 'image/jpeg'], 'PNG ou JPG');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const full = images.length >= max;

  const submit = async () => {
    if (!choice.file || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try { await onAdd(choice.file); choice.clear(); } catch (failure) {
      choice.setError(failure instanceof Error ? failure.message : 'Impossible d’ajouter l’image.');
    } finally { submitting.current = false; setSaving(false); }
  };

  return (
    <ModalShell title="Modifier le carrousel" onClose={onClose} busy={saving}>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {images.length ? `${images.length} image(s) sur ${max}. Plusieurs images défilent automatiquement.` : 'Aucune image personnalisée : les photos du campus par défaut sont affichées.'}
      </p>
      {!backgroundIsImage && <p className="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">Le fond du bandeau est actuellement une couleur ou un dégradé : ces images s’afficheront lorsque le type « Image » sera choisi dans Paramètres › Page d’accueil.</p>}
      {images.length > 0 && (
        <ul className="mb-4 grid grid-cols-2 gap-3">
          {images.map((url, index) => (
            <li key={url} className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(url) ?? ''} alt={`Image ${index + 1} du carrousel`} className="aspect-video w-full object-cover" />
              <button type="button" disabled={saving} onClick={() => onRemove(index)} aria-label={`Supprimer l’image ${index + 1}`} title="Supprimer" className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white transition hover:bg-rose-700 disabled:opacity-60"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      {choice.preview && <div className="mb-4"><Preview label="Aperçu de la nouvelle image" src={choice.preview} empty="" /></div>}
      {choice.error && <p role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300">{choice.error}</p>}
      <p className="mb-4 text-[11px] text-slate-500 dark:text-slate-400">PNG ou JPG — 5 Mo maximum par image.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <FilePicker label={full ? 'Maximum atteint' : 'Choisir une image'} accept="image/png,image/jpeg" disabled={saving || full} onPick={choice.choose} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" onClick={onClose} disabled={saving} className={secondaryBtn}>Fermer</button>
          <button type="button" onClick={() => void submit()} disabled={saving || !choice.file} className={primaryBtn}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Enregistrement…' : 'Ajouter l’image'}</button>
        </div>
      </div>
    </ModalShell>
  );
}
