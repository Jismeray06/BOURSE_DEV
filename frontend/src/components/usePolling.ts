'use client';

import { useEffect, useRef } from 'react';
import { runSilently } from './topLoadingBarState';

// Appelle `callback` à intervalle régulier tant que l'onglet est visible, et tout de suite
// quand l'utilisateur revient sur l'onglet. Utilisé pour garder les notifications à jour.
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const latest = useRef(callback);
  useEffect(() => { latest.current = callback; });

  useEffect(() => {
    if (!enabled) return;
    // `runSilently` : l'actualisation en arrière-plan n'affiche pas la barre de chargement.
    const run = () => { if (!document.hidden) runSilently(latest.current); };
    const timer = window.setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
    };
  }, [intervalMs, enabled]);
}
