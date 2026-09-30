'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { buildThemeCss, defaultSettings, loadSettings, type AdminSettings, type SettingsScope } from './adminSettings';

export function PlatformThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [systemDark, setSystemDark] = useState(true);
  const pathname = usePathname();
  const scope: SettingsScope | null = pathname.startsWith('/admin') ? 'admin' : pathname.startsWith('/etablissement') ? 'etablissement' : pathname.startsWith('/scolarite') ? 'scolarite' : pathname.startsWith('/student') ? 'student' : null;

  useEffect(() => {
    if (!scope) return;
    setSettings(loadSettings(scope));
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mediaQuery.matches);
    const onSystemChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    const onSettingsChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scope: SettingsScope; settings: AdminSettings }>).detail;
      if (detail?.scope === scope) setSettings(detail.settings);
      else if (!detail) setSettings(loadSettings(scope));
    };
    mediaQuery.addEventListener('change', onSystemChange);
    window.addEventListener('interface-settings-change', onSettingsChange);
    window.addEventListener('storage', onSettingsChange);
    return () => {
      mediaQuery.removeEventListener('change', onSystemChange);
      window.removeEventListener('interface-settings-change', onSettingsChange);
      window.removeEventListener('storage', onSettingsChange);
    };
  }, [scope]);

  const themeCss = useMemo(() => (scope ? buildThemeCss(settings, systemDark) : ''), [settings, systemDark, scope]);
  if (!scope) return <>{children}</>;
  return <div className="platform-theme min-h-full flex-1"><style dangerouslySetInnerHTML={{ __html: themeCss }} />{children}</div>;
}