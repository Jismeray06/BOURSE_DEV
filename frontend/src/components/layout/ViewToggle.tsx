'use client';

import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'blocs' | 'liste';

// Bouton à deux positions pour afficher une collection en blocs (cartes) ou en liste.
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div role="group" aria-label="Mode d'affichage" className="flex w-fit shrink-0 gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
      {([['blocs', 'Blocs', LayoutGrid], ['liste', 'Liste', List]] as const).map(([mode, label, Icon]) => (
        <button
          key={mode}
          type="button"
          title={label}
          aria-label={`Affichage en ${label.toLowerCase()}`}
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition cursor-pointer max-[1024px]:h-11 max-[1024px]:w-11 ${value === mode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
