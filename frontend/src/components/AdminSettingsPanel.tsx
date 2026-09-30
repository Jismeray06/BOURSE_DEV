'use client';

import { useState } from 'react';
import { Building2, Contrast, Monitor, Moon, Palette, SlidersHorizontal, Sun, Type } from 'lucide-react';
import { ACCENTS, BACKGROUNDS, type AdminSettings } from './adminSettings';

const fieldCls = 'AccountInput w-full text-base sm:text-sm max-[1024px]:min-h-[44px]';

export type SettingsTab = { id: string; label: string; icon: React.ReactNode; content: React.ReactNode };
type Props = {
  settings: AdminSettings;
  onChange: (next: AdminSettings) => void;
  /** Affiche la carte "Identité" (nom de l'université, année universitaire). Par défaut : oui. */
  identity?: boolean;
  /** Organise le panneau en onglets plutôt qu'en une seule grille. Par défaut : non (comportement historique). */
  tabbed?: boolean;
  /** Onglets additionnels ajoutés après ceux du panneau (ex. structure académique côté établissement). */
  extraTabs?: SettingsTab[];
  /** Onglet actif, piloté depuis l'extérieur (ex. un menu déroulant dans la barre latérale). */
  activeTabId?: string;
  /** Masque la barre d'onglets interne, quand la navigation est déjà assurée ailleurs (ex. barre latérale). */
  hideNav?: boolean;
};

export function AdminSettingsPanel({ settings, onChange, identity = true, tabbed = false, extraTabs = [], activeTabId: controlledTabId, hideNav = false }: Props) {
  const set = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => onChange({ ...settings, [key]: value });

  const [internalTabId, setInternalTabId] = useState<string>('appearance');
  const activeTabId = controlledTabId ?? internalTabId;

  const themeCard = <Card icon={<Palette className="h-5 w-5" />} title="Thème et couleurs" hint="Ambiance générale de l’interface.">
    <Field label="Thème"><Segmented value={settings.theme} onChange={(value) => set('theme', value)} options={[{ value: 'sombre', label: 'Sombre', icon: <Moon className="h-4 w-4" /> }, { value: 'minuit', label: 'Minuit', icon: <Contrast className="h-4 w-4" /> }, { value: 'clair', label: 'Clair', icon: <Sun className="h-4 w-4" /> }, { value: 'auto', label: 'Auto', icon: <Monitor className="h-4 w-4" /> }]} /></Field>
    <Field label="Couleur d’accentuation"><div className="flex flex-wrap items-center gap-2.5">{ACCENTS.map((accent) => <button key={accent.value} type="button" title={accent.name} aria-label={accent.name} onClick={() => set('accent', accent.value)} style={{ backgroundColor: accent.value, outline: settings.accent.toLowerCase() === accent.value ? '2px solid currentColor' : 'none', outlineOffset: 2 }} className="h-9 w-9 rounded-full border border-slate-700 text-white" />)}<label className="flex items-center gap-2 text-[11px] font-semibold text-slate-400"><input type="color" value={settings.accent} onChange={(event) => set('accent', event.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-transparent p-0.5" />Personnalisée</label></div></Field>
    <Field label="Couleur de fond"><div className="flex flex-wrap items-center gap-2.5"><button type="button" onClick={() => set('customBg', '')} className={`h-9 rounded-full border px-3 text-[11px] font-semibold ${!settings.customBg ? 'border-blue-500/40 bg-blue-600 text-white' : 'border-slate-700 text-slate-300'}`}>Selon le thème</button>{BACKGROUNDS.map((background) => <button key={background.value} type="button" title={background.name} aria-label={background.name} onClick={() => set('customBg', background.value)} style={{ backgroundColor: background.value, outline: settings.customBg.toLowerCase() === background.value ? '2px solid currentColor' : 'none', outlineOffset: 2 }} className="h-9 w-9 rounded-full border border-slate-700 text-white" />)}<label className="flex items-center gap-2 text-[11px] font-semibold text-slate-400"><input type="color" value={settings.customBg || '#0f172a'} onChange={(event) => set('customBg', event.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-transparent p-0.5" />Personnalisée</label></div></Field>
    <Field label="Style de fond"><Segmented value={settings.background} onChange={(value) => set('background', value)} options={[{ value: 'uni', label: 'Uni' }, { value: 'degrade', label: 'Dégradé' }, { value: 'points', label: 'Points' }]} /></Field>
    <Toggle label="Lueur décorative" hint="Halo lumineux flou en arrière-plan." checked={settings.glow} onChange={(value) => set('glow', value)} />
  </Card>;

  const textDisplayCard = <Card icon={<Type className="h-5 w-5" />} title="Texte et affichage" hint="Lisibilité et forme des éléments.">
    <Field label="Police"><Segmented value={settings.font} onChange={(value) => set('font', value)} options={[{ value: 'systeme', label: 'Système' }, { value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Monospace' }]} /></Field>
    <Field label="Taille du texte"><Segmented value={settings.fontScale} onChange={(value) => set('fontScale', value)} options={[{ value: 87.5, label: 'Petite' }, { value: 100, label: 'Normale' }, { value: 112.5, label: 'Grande' }, { value: 125, label: 'Très grande' }]} /></Field>
    <Field label="Arrondi des cartes et boutons"><Segmented value={settings.radius} onChange={(value) => set('radius', value)} options={[{ value: 'droit', label: 'Droit' }, { value: 'normal', label: 'Normal' }, { value: 'arrondi', label: 'Très arrondi' }]} /></Field>
    <Field label="Largeur du contenu"><Segmented value={settings.contentWidth} onChange={(value) => set('contentWidth', value)} options={[{ value: 'pleine', label: 'Pleine' }, { value: 'large', label: 'Large' }, { value: 'etroite', label: 'Étroite' }]} /></Field>
    <Toggle label="Contraste élevé" hint="Textes secondaires et bordures plus visibles." checked={settings.contrast} onChange={(value) => set('contrast', value)} />
    <Toggle label="Réduire les animations" hint="Supprime transitions et animations." checked={settings.reduceMotion} onChange={(value) => set('reduceMotion', value)} />
  </Card>;

  const behaviorCard = <Card icon={<SlidersHorizontal className="h-5 w-5" />} title="Comportement" hint="Fonctionnement du tableau de bord.">
    <Field label="Onglet affiché au démarrage"><select value={settings.startTab} onChange={(event) => set('startTab', event.target.value as AdminSettings['startTab'])} className={fieldCls}><option value="dashboard">Tableau de bord</option><option value="students">Étudiants</option><option value="accounts">Création des comptes</option><option value="settings">Paramètres</option></select></Field>
    <Field label="Actualisation automatique des données"><select value={settings.autoRefresh} onChange={(event) => set('autoRefresh', Number(event.target.value))} className={fieldCls}><option value={0}>Désactivée</option><option value={30}>Toutes les 30 secondes</option><option value={60}>Toutes les minutes</option><option value={300}>Toutes les 5 minutes</option></select></Field>
    <Toggle label="Confirmer avant de changer un statut" hint="Évite les validations ou refus accidentels." checked={settings.confirmStatus} onChange={(value) => set('confirmStatus', value)} />
  </Card>;

  const identityCard = <Card icon={<Building2 className="h-5 w-5" />} title="Identité" hint="Textes affichés dans l’en-tête et le menu.">
    <Field label="Nom de l’université"><input value={settings.universityName} maxLength={40} onChange={(event) => set('universityName', event.target.value)} className={fieldCls} /></Field>
    <Field label="Année universitaire"><input value={settings.academicYear} maxLength={20} onChange={(event) => set('academicYear', event.target.value)} className={fieldCls} /></Field>
  </Card>;

  const intro = <p className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-200">Les modifications s’appliquent immédiatement et sont enregistrées automatiquement sur cet appareil.</p>;

  if (!tabbed) {
    return <div className="space-y-4 sm:space-y-6">
      {intro}
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">{themeCard}{textDisplayCard}{behaviorCard}{identity && identityCard}</div>
    </div>;
  }

  const tabs: SettingsTab[] = [
    { id: 'appearance', label: 'Apparence & Affichage', icon: <Palette className="h-4 w-4" />, content: <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">{themeCard}{textDisplayCard}</div> },
    { id: 'behavior', label: 'Comportement', icon: <SlidersHorizontal className="h-4 w-4" />, content: <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">{behaviorCard}</div> },
    ...(identity ? [{ id: 'identity', label: 'Identité', icon: <Building2 className="h-4 w-4" />, content: <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">{identityCard}</div> }] : []),
    ...extraTabs,
  ];
  const active = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  return <div className="space-y-4 sm:space-y-6">
    {intro}
    {!hideNav && <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-2">
      {tabs.map((tab) => <button key={tab.id} type="button" aria-pressed={active.id === tab.id} onClick={() => setInternalTabId(tab.id)} className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition max-[1024px]:min-h-[44px] ${active.id === tab.id ? 'border-blue-500/40 bg-blue-600 text-white' : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'}`}>{tab.icon}{tab.label}</button>)}
    </div>}
    {active.content}
  </div>;
}

function Card({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }) { return <section className="min-w-0 rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6"><div className="mb-5 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">{icon}</div><div className="min-w-0"><h2 className="text-base font-bold text-white">{title}</h2>{hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}</div></div><div className="space-y-5">{children}</div></section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><p className="mb-2 text-xs font-semibold text-slate-300">{label}</p>{children}</div>; }
function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string; icon?: React.ReactNode }[]; onChange: (value: T) => void }) { return <div className="flex flex-wrap gap-2">{options.map((option) => <button key={String(option.value)} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`flex min-w-[5.5rem] flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition max-[1024px]:min-h-[44px] ${value === option.value ? 'border-blue-500/40 bg-blue-600 text-white' : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-blue-500/50'}`}>{option.icon}{option.label}</button>)}</div>; }
function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) { return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left max-[1024px]:min-h-[44px]"><span className="min-w-0"><span className="block text-xs font-semibold text-slate-200">{label}</span>{hint && <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span>}</span><span className={`relative h-6 w-11 shrink-0 rounded-full border transition ${checked ? 'border-blue-500/40 bg-blue-600' : 'border-slate-700 bg-slate-800'}`}><span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`} /></span></button>; }
