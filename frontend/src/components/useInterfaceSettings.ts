'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { defaultSettings, loadSettings, saveSettings, type AdminSettings, type SettingsScope } from './adminSettings';

export function useInterfaceSettings(scope: SettingsScope) {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(loadSettings(scope));
    setReady(true);
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scope: SettingsScope; settings: AdminSettings }>).detail;
      if (detail?.scope === scope) setSettings(detail.settings);
    };
    window.addEventListener('interface-settings-change', onChange);
    return () => window.removeEventListener('interface-settings-change', onChange);
  }, [scope]);

  useEffect(() => {
    if (ready) saveSettings(settings, scope);
  }, [ready, scope, settings]);

  return [settings, setSettings] as const;
}

const darkQuery = '(prefers-color-scheme: dark)';
const subscribeSystemTheme = (onChange: () => void) => {
  const query = window.matchMedia(darkQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
// Préférence claire/sombre du système (utile quand le thème de l'interface est « Auto »).
export function useSystemDark() {
  return useSyncExternalStore(subscribeSystemTheme, () => window.matchMedia(darkQuery).matches, () => true);
}
