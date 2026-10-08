'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSystemDark } from './useInterfaceSettings';
import { buildThemeCss, defaultSettings, loadSettings, type AdminSettings, type SettingsScope } from './adminSettings';

export function PlatformThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const systemDark = useSystemDark();
  const pathname = usePathname();
  const scope: SettingsScope | null = pathname.startsWith('/admin') ? 'admin' : pathname.startsWith('/etablissement') ? 'etablissement' : pathname.startsWith('/scolarite') ? 'scolarite' : pathname.startsWith('/student') ? 'student' : null;

  useEffect(() => {
    if (!scope) return;
    // Lecture de localStorage uniquement après l'hydratation (évite un décalage serveur/client).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings(scope));
    const onSettingsChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scope: SettingsScope; settings: AdminSettings }>).detail;
      if (detail?.scope === scope) setSettings(detail.settings);
      else if (!detail) setSettings(loadSettings(scope));
    };
    window.addEventListener('interface-settings-change', onSettingsChange);
    window.addEventListener('storage', onSettingsChange);
    return () => {
      window.removeEventListener('interface-settings-change', onSettingsChange);
      window.removeEventListener('storage', onSettingsChange);
    };
  }, [scope]);

  const themeCss = useMemo(() => (scope ? buildThemeCss(settings, systemDark) : ''), [settings, systemDark, scope]);
  if (!scope) return <>{children}</>;
  return <div className="platform-theme min-h-full flex-1"><style dangerouslySetInnerHTML={{ __html: themeCss }} />{children}</div>;
}