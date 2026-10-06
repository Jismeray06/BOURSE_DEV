export type ThemeMode = 'auto' | 'sombre' | 'minuit' | 'clair';
export type TabId = 'dashboard' | 'students' | 'accounts' | 'settings';

export type AdminSettings = {
  theme: ThemeMode;
  accent: string;
  customBg: string;
  background: 'uni' | 'degrade' | 'points';
  glow: boolean;
  font: 'systeme' | 'serif' | 'mono';
  fontScale: number;
  radius: 'droit' | 'normal' | 'arrondi';
  contentWidth: 'pleine' | 'large' | 'etroite';
  contrast: boolean;
  reduceMotion: boolean;
  confirmStatus: boolean;
  autoRefresh: number;
  startTab: TabId;
  universityName: string;
  academicYear: string;
};

export const defaultSettings: AdminSettings = {
  theme: 'clair',
  accent: '#2563eb',
  customBg: '',
  background: 'uni',
  glow: true,
  font: 'systeme',
  fontScale: 100,
  radius: 'normal',
  contentWidth: 'pleine',
  contrast: false,
  reduceMotion: false,
  confirmStatus: true,
  autoRefresh: 0,
  startTab: 'dashboard',
  universityName: 'Univ Mahajanga',
  academicYear: '2025-2026',
};

export const ACCENTS = [
  { name: 'Bleu', value: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Rose', value: '#db2777' },
  { name: 'Rouge', value: '#e11d48' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Ambre', value: '#d97706' },
  { name: 'Vert', value: '#059669' },
  { name: 'Turquoise', value: '#0891b2' },
];

export const BACKGROUNDS = [
  { name: 'Ardoise', value: '#0f172a' },
  { name: 'Noir', value: '#000000' },
  { name: 'Nuit', value: '#0b1020' },
  { name: 'Forêt', value: '#06140f' },
  { name: 'Bordeaux', value: '#1a0b10' },
  { name: 'Ivoire', value: '#faf7f0' },
  { name: 'Gris clair', value: '#f1f5f9' },
];

const KEY = 'admin_ui_settings';
export type SettingsScope = 'admin' | 'etablissement' | 'student' | 'scolarite';
const keyForScope = (scope: SettingsScope) => scope === 'admin' ? KEY : `_${scope}_ui_settings`;
const HEX = /^#[0-9a-f]{6}$/i;
const TABS: TabId[] = ['dashboard', 'students', 'accounts', 'settings'];

export function parseSettings(json: string): AdminSettings | null {
  try {
    const data = JSON.parse(json) as Record<string, unknown> | null;
    if (!data || typeof data !== 'object') return null;
    const legacyTheme: Record<string, ThemeMode> = { dark: 'sombre', midnight: 'minuit', light: 'clair', system: 'auto' };
    const legacyBackground: Record<string, AdminSettings['background']> = { solid: 'uni', glow: 'degrade', dots: 'points' };
    const legacyFont: Record<string, AdminSettings['font']> = { system: 'systeme', serif: 'serif', mono: 'mono' };
    const legacyRadius: Record<string, AdminSettings['radius']> = { none: 'droit', normal: 'normal', full: 'arrondi' };
    const legacyWidth: Record<string, AdminSettings['contentWidth']> = { full: 'pleine', wide: 'large', narrow: 'etroite' };
    const migrated: Record<string, unknown> = {
      ...data,
      ...(typeof data.theme === 'string' && legacyTheme[data.theme] ? { theme: legacyTheme[data.theme] } : {}),
      ...(typeof data.accentColor === 'string' ? { accent: data.accentColor === 'custom' ? data.customAccent : data.accentColor } : {}),
      ...(typeof data.backgroundColor === 'string' ? { customBg: data.backgroundColor === '#020617' ? '' : data.backgroundColor } : {}),
      ...(typeof data.backgroundStyle === 'string' && legacyBackground[data.backgroundStyle] ? { background: legacyBackground[data.backgroundStyle] } : {}),
      ...(typeof data.decorativeGlow === 'boolean' ? { glow: data.decorativeGlow } : {}),
      ...(typeof data.fontFamily === 'string' && legacyFont[data.fontFamily] ? { font: legacyFont[data.fontFamily] } : {}),
      ...(data.textSize === 'sm' ? { fontScale: 87.5 } : data.textSize === 'lg' ? { fontScale: 112.5 } : data.textSize === 'xl' ? { fontScale: 125 } : {}),
      ...(typeof data.roundness === 'string' && legacyRadius[data.roundness] ? { radius: legacyRadius[data.roundness] } : {}),
      ...(typeof data.contentWidth === 'string' && legacyWidth[data.contentWidth] ? { contentWidth: legacyWidth[data.contentWidth] } : {}),
      ...(typeof data.highContrast === 'boolean' ? { contrast: data.highContrast } : {}),
      ...(typeof data.confirmStatusChange === 'boolean' ? { confirmStatus: data.confirmStatusChange } : {}),
      ...(data.autoRefresh === '30s' ? { autoRefresh: 30 } : data.autoRefresh === '1m' ? { autoRefresh: 60 } : data.autoRefresh === '5m' ? { autoRefresh: 300 } : {}),
    };
    const next = { ...defaultSettings } as Record<string, unknown>;
    for (const key of Object.keys(defaultSettings) as (keyof AdminSettings)[]) {
      if (key in migrated && typeof migrated[key] === typeof defaultSettings[key]) next[key] = migrated[key];
    }
    const result = next as AdminSettings;
    if (!TABS.includes(result.startTab)) result.startTab = 'dashboard';
    if (!HEX.test(result.accent)) result.accent = defaultSettings.accent;
    if (result.customBg && !HEX.test(result.customBg)) result.customBg = '';
    if (![87.5, 100, 112.5, 125].includes(result.fontScale)) result.fontScale = 100;
    if (![0, 30, 60, 300].includes(result.autoRefresh)) result.autoRefresh = 0;
    return result;
  } catch {
    return null;
  }
}

export function loadSettings(scope: SettingsScope = 'admin'): AdminSettings {
  try {
    const raw = localStorage.getItem(keyForScope(scope)) ?? (scope === 'admin' ? localStorage.getItem('admin_settings') : null);
    return (raw && parseSettings(raw)) || defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AdminSettings, scope: SettingsScope = 'admin') {
  try {
    localStorage.setItem(keyForScope(scope), JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('interface-settings-change', { detail: { scope, settings } }));
  } catch { /* stockage indisponible */ }
}

export function resolveMode(settings: AdminSettings, systemDark: boolean): 'sombre' | 'minuit' | 'clair' {
  if (settings.theme === 'auto') return systemDark ? 'sombre' : 'clair';
  return settings.theme === 'clair' || settings.theme === 'minuit' ? settings.theme : 'sombre';
}

const isLightColor = (hex: string) => {
  const number = parseInt(hex.slice(1), 16);
  return (0.299 * ((number >> 16) & 255) + 0.587 * ((number >> 8) & 255) + 0.114 * (number & 255)) / 255 > 0.6;
};
// Le rendu est-il sombre ? Une couleur de fond personnalisée prime sur le thème choisi.
export function isDarkRendering(settings: AdminSettings, systemDark: boolean): boolean {
  return HEX.test(settings.customBg) ? !isLightColor(settings.customBg) : resolveMode(settings, systemDark) !== 'clair';
}

// Bascule clair <-> sombre. Si la couleur de fond personnalisée empêche de changer d'aspect, on l'écarte.
export function toggleLightDark(settings: AdminSettings, systemDark: boolean): AdminSettings {
  const goLight = isDarkRendering(settings, systemDark);
  const backgroundBlocks = HEX.test(settings.customBg) && isLightColor(settings.customBg) !== goLight;
  return { ...settings, theme: goLight ? 'clair' : 'sombre', customBg: backgroundBlocks ? '' : settings.customBg };
}

const mix = (a: string, b: string, pctB: number) => `color-mix(in srgb, ${a} ${100 - pctB}%, ${b})`;
const alpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;
const escapeClass = (value: string) => value.replace(/[:/.[\]%]/g, '\\$&');

const SLATE_TOKENS = [
  'bg-slate-950', 'bg-slate-950/50', 'bg-slate-950/60', 'bg-slate-950/70', 'bg-slate-900', 'bg-slate-900/90', 'bg-slate-900/95', 'bg-slate-800',
  'hover:bg-slate-800', 'hover:bg-slate-800/60', 'border-slate-800', 'border-slate-800/70', 'border-slate-800/80', 'border-slate-700',
  'text-white', 'hover:text-white', 'text-slate-100', 'text-slate-200', 'hover:text-slate-200', 'text-slate-300', 'text-slate-400', 'text-slate-500', 'placeholder:text-slate-500',
];
const ACCENT_TOKENS = [
  'bg-blue-600', 'bg-blue-600/10', 'hover:bg-blue-500', 'bg-blue-500/5', 'bg-blue-500/10', 'bg-blue-500/20', 'hover:bg-blue-500/10',
  'text-blue-200', 'text-blue-300', 'text-blue-400', 'hover:text-blue-300', 'group-hover:text-blue-300', 'border-blue-500/20', 'border-blue-500/30', 'border-blue-500/40', 'border-blue-500/50', 'hover:border-blue-500/50', 'hover:border-blue-500/60', 'focus:border-blue-500',
];
const STATUS_TOKENS = ['text-amber-300', 'text-amber-400', 'text-emerald-200', 'text-emerald-300', 'text-emerald-400', 'text-rose-200', 'text-rose-300', 'text-rose-400', 'hover:text-rose-400', 'text-sky-300'];
const TONE_LIGHT: Record<string, string> = { amber: '#b45309', emerald: '#047857', rose: '#be123c', sky: '#0369a1' };
const TOKEN_RE = /^((?:[a-z-]+:)*)((?:bg|text|border))-([a-z]+)(?:-(\d+))?(?:\/(\d+))?$/;
const PROP = { bg: 'background-color', text: 'color', border: 'border-color' } as const;

export function buildThemeCss(settings: AdminSettings, systemDark: boolean): string {
  const mode = resolveMode(settings, systemDark);
  const background = HEX.test(settings.customBg) ? settings.customBg : '';
  const accent = HEX.test(settings.accent) ? settings.accent : defaultSettings.accent;
  const light = background ? isLightColor(background) : mode === 'clair';
  let palette: Record<string, string>;
  if (light) palette = { '950': '#f1f5f9', '900': '#ffffff', '800': '#e2e8f0', '700': '#cbd5e1', '500': '#64748b', '400': '#475569', '300': '#334155', '200': '#1e293b', '100': '#0f172a', white: '#0f172a' };
  else if (mode === 'minuit') palette = { '950': '#000000', '900': '#0a0a0b', '800': '#18181b', '700': '#27272a', '500': '#64748b', '400': '#94a3b8', '300': '#cbd5e1', '200': '#e2e8f0', '100': '#f1f5f9', white: '#ffffff' };
  else palette = { '950': '#020617', '900': '#0f172a', '800': '#1e293b', '700': '#334155', '500': '#64748b', '400': '#94a3b8', '300': '#cbd5e1', '200': '#e2e8f0', '100': '#f1f5f9', white: '#ffffff' };
  if (background) {
    palette['950'] = background;
    if (light) { palette['900'] = mix(background, '#ffffff', 60); palette['800'] = mix(background, '#000000', 7); palette['700'] = mix(background, '#000000', 15); }
    else { palette['900'] = mix(background, '#ffffff', 6); palette['800'] = mix(background, '#ffffff', 12); palette['700'] = mix(background, '#ffffff', 20); }
  }
  if (settings.contrast) Object.assign(palette, light ? { '500': '#1e293b', '400': '#0f172a', '300': '#0f172a', '700': '#64748b' } : { '500': '#cbd5e1', '400': '#e2e8f0', '300': '#f1f5f9', '700': '#64748b' });
  const accentPalette: Record<string, string> = light ? { '200': mix(accent, '#000000', 55), '300': mix(accent, '#000000', 35), '400': mix(accent, '#000000', 15), '500': mix(accent, '#ffffff', 12), '600': accent } : { '200': mix(accent, '#ffffff', 60), '300': mix(accent, '#ffffff', 45), '400': mix(accent, '#ffffff', 25), '500': mix(accent, '#ffffff', 12), '600': accent };
  const colorFor = (color: string, shade?: string) => color === 'white' ? palette.white : color === 'slate' && shade ? palette[shade] : color === 'blue' && shade ? accentPalette[shade] : color === 'indigo' ? accentPalette['500'] : light && TONE_LIGHT[color] ? TONE_LIGHT[color] : undefined;
  const rule = (token: string) => {
    const match = TOKEN_RE.exec(token); if (!match) return '';
    const [, variant, utility, color, shade, opacity] = match; let value = colorFor(color, shade); if (!value) return '';
    if (opacity) value = alpha(value, Number(opacity));
    const className = `.${escapeClass(token)}`;
    const selector = variant === '' ? `.platform-theme${className}, .platform-theme ${className}` : variant === 'hover:' ? `.platform-theme${className}:hover, .platform-theme ${className}:hover` : variant === 'focus:' ? `.platform-theme ${className}:focus` : variant === 'placeholder:' ? `.platform-theme ${className}::placeholder` : variant === 'group-hover:' ? `.platform-theme .group:hover ${className}` : '';
    return selector ? `${selector}{${PROP[utility as keyof typeof PROP]}:${value}!important}` : '';
  };
  const css: string[] = [`body{background-color:${palette['950']}}`, `.platform-theme{color-scheme:${light ? 'light' : 'dark'};font-size:${settings.fontScale}%}`];
  if (light || mode === 'minuit' || background || settings.contrast) SLATE_TOKENS.forEach((token) => css.push(rule(token)));
  STATUS_TOKENS.forEach((token) => css.push(rule(token)));
  ACCENT_TOKENS.forEach((token) => css.push(rule(token)));
  css.push(`.platform-theme [class*="from-blue-600"]{background-image:linear-gradient(to top right,${accentPalette['600']},${accentPalette['500']})!important}`);
  css.push(`.platform-theme .AccountInput{background-color:${palette['950']}!important;color:${palette['100']}!important;border-color:${palette['700']}!important}.platform-theme .AccountInput::placeholder{color:${palette['500']}!important}.platform-theme option{background-color:${palette['900']};color:${palette['100']}}`);
  if (settings.background === 'degrade') css.push(`.platform-theme{background-image:radial-gradient(900px circle at 0% 0%,${alpha(accentPalette['600'], 22)},transparent 60%),radial-gradient(900px circle at 100% 100%,${alpha(accentPalette['600'], 14)},transparent 60%);background-attachment:fixed}`);
  if (settings.background === 'points') css.push(`.platform-theme{background-image:radial-gradient(${alpha(palette['500'], 40)} 1px,transparent 1px);background-size:22px 22px}`);
  if (!settings.glow) css.push('.platform-theme .adm-glow{display:none!important}');
  if (settings.font === 'serif') css.push('.platform-theme{font-family:Georgia,Cambria,"Times New Roman",serif}');
  if (settings.font === 'mono') css.push('.platform-theme{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}');
  if (settings.radius === 'droit') ['lg:2', 'xl:4', '2xl:6', '3xl:8'].forEach((item) => { const [name, value] = item.split(':'); css.push(`.platform-theme .rounded-${name}{border-radius:${value}px!important}`); });
  if (settings.radius === 'arrondi') ['lg:12', 'xl:18', '2xl:26', '3xl:36'].forEach((item) => { const [name, value] = item.split(':'); css.push(`.platform-theme .rounded-${name}{border-radius:${value}px!important}`); });
  if (settings.contentWidth === 'large') css.push('.platform-theme main{width:100%;max-width:1440px;margin-inline:auto}');
  if (settings.contentWidth === 'etroite') css.push('.platform-theme main{width:100%;max-width:1100px;margin-inline:auto}');
  if (settings.reduceMotion) css.push('.platform-theme,.platform-theme *{transition:none!important;animation:none!important;scroll-behavior:auto!important}');
  return css.filter(Boolean).join('\n');
}
