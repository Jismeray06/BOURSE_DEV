'use client';

import { useEffect, useState } from 'react';
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