'use client';

import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import {
  ChartNoAxesCombined,
  Code2,
  FlaskConical,
  GraduationCap,
  Landmark,
  Languages,
  LibraryBig,
  Pill,
  Stethoscope,
  Waves,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Établissement tel que l'étudiant le voit : la liste est gérée par l'administrateur.
export type PublicEstablishment = { id: string; name: string; logoUrl: string | null };

// Pictogrammes de repli (quand l'établissement n'a pas de logo), pour les établissements d'origine.
const ESTABLISHMENT_ICONS: Record<string, LucideIcon> = {
  ENS: GraduationCap,
  'Faculté de Médecine': Stethoscope,
  FSTE: FlaskConical,
  IOSTM: Waves,
  'ILC-SS': Languages,
  ISSTM: Code2,
  IUGM: ChartNoAxesCombined,
  IUTAM: Wrench,
  EDSP: Landmark,
  'École de Pharmacie': Pill,
  ELCI: LibraryBig,
};

// Pictogramme d'un établissement (repli quand il n'a pas de logo).
export function EstablishmentIcon({ name, className }: { name: string; className?: string }) {
  return createElement(ESTABLISHMENT_ICONS[name] ?? GraduationCap, { className });
}
export const logoSrc = (url: string | null | undefined) => (url ? `${apiUrl}${url}` : null);

// `onLoaded` est appelé à chaque chargement de la liste (utile pour présélectionner un établissement).
export function useEstablishments(onLoaded?: (list: PublicEstablishment[]) => void) {
  const [establishments, setEstablishments] = useState<PublicEstablishment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => { onLoadedRef.current = onLoaded; });

  const reload = useCallback(() => {
    void fetch(`${apiUrl}/establishments`)
      .then((response) => (response.ok ? (response.json() as Promise<PublicEstablishment[]>) : []))
      .then((list) => { setEstablishments(list); onLoadedRef.current?.(list); })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { establishments, loaded, reload };
}
