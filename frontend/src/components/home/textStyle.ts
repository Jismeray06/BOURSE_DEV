import type { CSSProperties } from 'react';

// Mise en forme d'un texte de la page d'accueil, choisie par l'administrateur depuis le crayon.
// Les valeurs possibles sont les mêmes que celles acceptées par le serveur (homepage.service.ts).
export type TextFont = 'titre' | 'manuscrit' | 'serif' | 'mono';
export type TextSize = 'petit' | 'grand' | 'tres-grand' | 'enorme';
export type TextStyle = { color?: string; font?: TextFont; size?: TextSize; bold?: boolean; italic?: boolean; underline?: boolean };

export const FONT_OPTIONS: { value: TextFont | ''; label: string; family?: string }[] = [
  { value: '', label: 'Police d’origine' },
  { value: 'titre', label: 'Élégante (titres)', family: 'var(--font-heading), Georgia, serif' },
  { value: 'manuscrit', label: 'Manuscrite', family: 'var(--font-script), cursive' },
  { value: 'serif', label: 'Classique (serif)', family: 'Georgia, "Times New Roman", serif' },
  { value: 'mono', label: 'Machine à écrire', family: 'ui-monospace, "Cascadia Code", Menlo, monospace' },
];

export const SIZE_OPTIONS: { value: TextSize | ''; label: string; scale?: string }[] = [
  { value: 'petit', label: 'Petit', scale: '0.85em' },
  { value: '', label: 'Normal' },
  { value: 'grand', label: 'Grand', scale: '1.25em' },
  { value: 'tres-grand', label: 'Très grand', scale: '1.6em' },
  { value: 'enorme', label: 'Énorme', scale: '2em' },
];

export const COLOR_SWATCHES = ['#0b2c55', '#2563eb', '#0f766e', '#16a34a', '#f59e0b', '#ea580c', '#dc2626', '#9333ea', '#ffffff', '#111827'];

export function isEmptyStyle(style: TextStyle | undefined) {
  return !style || !(style.color || style.font || style.size || style.bold || style.italic || style.underline);
}

export function styleToCss(style: TextStyle | undefined): CSSProperties | undefined {
  if (isEmptyStyle(style)) return undefined;
  const { color, font, size, bold, italic, underline } = style ?? {};
  const css: CSSProperties = {};
  if (color) css.color = color;
  if (font) css.fontFamily = FONT_OPTIONS.find((option) => option.value === font)?.family;
  if (size) css.fontSize = SIZE_OPTIONS.find((option) => option.value === size)?.scale;
  if (bold) css.fontWeight = 700;
  if (italic) css.fontStyle = 'italic';
  if (underline) css.textDecoration = 'underline';
  return css;
}

/** Retire les options vides pour ne garder que ce qui change l'apparence d'origine. */
export function cleanStyle(style: TextStyle): TextStyle {
  const result: TextStyle = {};
  if (style.color) result.color = style.color;
  if (style.font) result.font = style.font;
  if (style.size) result.size = style.size;
  if (style.bold) result.bold = true;
  if (style.italic) result.italic = true;
  if (style.underline) result.underline = true;
  return result;
}

export function sameStyle(a: TextStyle | undefined, b: TextStyle | undefined) {
  return JSON.stringify(cleanStyle(a ?? {})) === JSON.stringify(cleanStyle(b ?? {}));
}
