import { defaultContent } from './homepageStore';
import { settingTranslations, translations, uiText } from './homepage-translations';
import type { Language } from './language';

// Texte d'une clé de la page d'accueil dans la langue choisie.
// Un texte modifié par l'administrateur (différent du texte d'origine) est affiché tel quel dans toutes les langues.
export function translateKey(key: string, content: Record<string, string>, language: Language): string {
  const text = content[key] ?? defaultContent[key] ?? '';
  if (language === 'fr') return text;
  const original = defaultContent[key];
  if (original !== undefined && text !== original) return text;
  return translations[language][key] ?? text;
}

const normalize = (value: string) => value.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();

// Texte d'un réglage du bandeau (titre, sous-titre, bouton) : traduit seulement s'il est encore égal à une valeur d'origine.
export function translateSetting(value: string, language: Language): string {
  if (language === 'fr') return value;
  return settingTranslations[language][normalize(value)] ?? value;
}

export function ui(key: string, language: Language): string {
  return uiText[language][key] ?? uiText.fr[key] ?? key;
}
