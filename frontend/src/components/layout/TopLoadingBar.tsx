'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isSilent } from './topLoadingBarState';

const SHOW_DELAY_MS = 120; // les requêtes très rapides n'affichent rien
const TRICKLE_MS = 200;
const MAX_TRICKLE = 90;
const FINISH_MS = 300;

const isPrefetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  return headers.has('Next-Router-Prefetch');
};

const isAsset = (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return url.includes('/_next/') || url.includes('__nextjs');
};

// Barre de progression fine en haut de la page : chargement initial, navigation et appels au serveur.
export function TopLoadingBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const active = useRef(0);
  const progressRef = useRef(0);
  const timers = useRef<{ show?: number; trickle?: number; hide?: number }>({});
  const controls = useRef<{ start: (immediate?: boolean) => void; done: () => void }>({ start: () => undefined, done: () => undefined });
  const firstPath = useRef(pathname);

  useEffect(() => {
    const t = timers.current;
    const set = (value: number) => { progressRef.current = value; setProgress(value); };
    const clearAll = () => { window.clearTimeout(t.show); window.clearInterval(t.trickle); window.clearTimeout(t.hide); };

    const start = (immediate = false) => {
      active.current += 1;
      if (active.current > 1) return;
      clearAll();
      const begin = () => {
        set(Math.max(progressRef.current, 8));
        setVisible(true);
        t.trickle = window.setInterval(() => {
          set(progressRef.current + (MAX_TRICKLE - progressRef.current) * 0.1);
        }, TRICKLE_MS);
      };
      if (immediate) begin();
      else t.show = window.setTimeout(begin, SHOW_DELAY_MS);
    };

    const done = () => {
      active.current = Math.max(0, active.current - 1);
      if (active.current > 0) return;
      clearAll();
      if (!progressRef.current) return; // jamais affichée
      set(100);
      t.hide = window.setTimeout(() => {
        setVisible(false);
        t.hide = window.setTimeout(() => set(0), FINISH_MS);
      }, FINISH_MS);
    };

    controls.current = { start, done };

    // Chargement initial de la page.
    start(true);
    const onLoad = () => window.setTimeout(done, 150);
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });

    // Suivi des requêtes (inclut les chargements de pages de Next), hors préchargement et polling.
    const originalFetch = window.fetch;
    window.fetch = (input, init) => {
      if (isSilent() || isAsset(input) || isPrefetch(input, init)) return originalFetch.call(window, input, init);
      start();
      let finished = false;
      const finish = () => { if (!finished) { finished = true; done(); } };
      return originalFetch.call(window, input, init).then(
        (response) => { finish(); return response; },
        (error: unknown) => { finish(); throw error; },
      );
    };

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('load', onLoad);
      clearAll();
      active.current = 0;
    };
  }, []);

  // Navigation déjà préchargée (aucune requête) : on affiche quand même un passage rapide.
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    if (active.current > 0) return;
    controls.current.start(true);
    const timer = window.setTimeout(() => controls.current.done(), 100);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      role="progressbar"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: `opacity ${FINISH_MS}ms ease` }}
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.7)]"
        style={{ width: `${progress}%`, transition: progress === 0 ? 'none' : `width ${TRICKLE_MS}ms ease-out` }}
      />
    </div>
  );
}
