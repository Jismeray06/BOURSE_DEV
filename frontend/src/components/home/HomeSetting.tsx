'use client';

import { useHomeEdit } from './HomepageEditor';
import { useLanguage } from './language';
import { translateSetting } from './translate';

// Texte d'un réglage du site (titre, sous-titre, bouton du bandeau) dans la langue choisie.
// En mode personnalisation, le texte français réel est affiché pour pouvoir être modifié.
export function HomeSetting({ value }: { value: string }) {
  const language = useLanguage();
  const { editMode } = useHomeEdit();
  return <>{editMode ? value : translateSetting(value, language)}</>;
}
