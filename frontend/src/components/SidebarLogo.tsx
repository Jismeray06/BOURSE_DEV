'use client';

import { useEffect, useState } from 'react';
import { assetUrl, DEFAULT_LOGO, fetchSiteSettings } from './siteSettings';

// Logo rond de l'en-tête des menus latéraux : celui de l'établissement s'il est fourni, sinon celui du site.
export function SidebarLogo({ src }: { src?: string | null }) {
  const [siteLogo, setSiteLogo] = useState(DEFAULT_LOGO);
  useEffect(() => {
    if (src) return;
    let active = true;
    fetchSiteSettings()
      .then((settings) => active && setSiteLogo(assetUrl(settings.logoUrl) ?? DEFAULT_LOGO))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src || siteLogo} alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-contain p-1 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30" />
  );
}
