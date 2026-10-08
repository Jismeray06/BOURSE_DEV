'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Bell, ChevronDown, Moon, Pencil, Sun } from 'lucide-react';
import { avatarSrc, useProfile } from './useProfile';

export type ToolbarNotification = { id: string; title: string; subtitle: string; onClick: () => void; /** Faux = non lue (mise en évidence). Absent = pas de notion de lecture. */ read?: boolean };
export type ToolbarMenuItem = { label: string; icon: ReactNode; onClick: () => void; danger?: boolean };

type Props = {
  darkMode: boolean;
  onToggleTheme: () => void;
  notifications: ToolbarNotification[];
  /** Nombre réel d'éléments (la liste affichée peut être tronquée). Par défaut : taille de la liste. */
  totalCount?: number;
  /** Masque la bascule clair/sombre (ex. apparence imposée par le responsable). Par défaut : visible. */
  showThemeToggle?: boolean;
  /** Administrateur : ouvre la page d'accueil en mode personnalisation (icône crayon à côté de la bascule de thème). */
  onEditHomepage?: () => void;
  notificationsTitle: string;
  notificationsEmpty: string;
  onSeeAllNotifications?: () => void;
  /** Affiche le bouton « Tout marquer comme lu » dans le menu des notifications. */
  onMarkAllRead?: () => void;
  seeAllLabel?: string;
  roleLabel: string;
  menuItems: ToolbarMenuItem[];
};

const subscribeNothing = () => () => undefined;
// Utilisateur connecté, lu dans la session du navigateur (rien côté serveur : pas d'écart d'hydratation).
const readUserSnapshot = () => sessionStorage.getItem('auth_user') ?? '';

function useSessionUser() {
  const raw = useSyncExternalStore(subscribeNothing, readUserSnapshot, () => '');
  try {
    return raw ? (JSON.parse(raw) as { fullName?: string }) : {};
  } catch {
    return {};
  }
}

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';

// Barre d'outils de l'en-tête : bascule clair/sombre, notifications, menu de l'utilisateur.
export function HeaderToolbar({ darkMode, onToggleTheme, notifications, totalCount, showThemeToggle = true, onEditHomepage, notificationsTitle, notificationsEmpty, onSeeAllNotifications, onMarkAllRead, seeAllLabel = 'Voir tout', roleLabel, menuItems }: Props) {
  const count = totalCount ?? notifications.length;
  const user = useSessionUser();
  const profile = useProfile();
  const name = profile?.fullName.trim() || user.fullName?.trim() || 'Utilisateur';
  const avatar = avatarSrc(profile?.avatarUrl);
  const [open, setOpen] = useState<'notifications' | 'user' | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [open]);

  const iconButton = 'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-blue-500/50 hover:text-white';

  return (
    <div ref={container} className="flex shrink-0 items-center gap-2 sm:gap-3">
      {showThemeToggle && <button
        type="button"
        role="switch"
        aria-checked={!darkMode}
        aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
        title={darkMode ? 'Mode clair' : 'Mode sombre'}
        onClick={onToggleTheme}
        className="relative hidden h-7 w-14 shrink-0 items-center rounded-full border border-slate-700 bg-slate-800 transition sm:flex"
      >
        <span className={`absolute left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow transition-transform ${darkMode ? 'translate-x-0' : 'translate-x-7'}`}>
          {darkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </span>
      </button>}

      {onEditHomepage && (
        <button type="button" aria-label="Personnaliser la page d’accueil" title="Personnaliser la page d’accueil" onClick={onEditHomepage} className={iconButton}>
          <Pencil className="h-5 w-5" />
        </button>
      )}

      <div className="relative">
        <button type="button" aria-label={`Notifications (${count})`} aria-expanded={open === 'notifications'} onClick={() => setOpen(open === 'notifications' ? null : 'notifications')} className={iconButton}>
          <Bell className="h-5 w-5" />
          {count > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900" />}
        </button>
        {open === 'notifications' && (
          <div role="menu" className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-bold text-white">{notificationsTitle}</p>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">{count}</span>
            </div>
            {onMarkAllRead && count > 0 && <button type="button" onClick={() => { onMarkAllRead(); }} className="block w-full border-b border-slate-800 px-4 py-2 text-left text-[11px] font-bold text-blue-400 transition hover:bg-slate-800/60">Tout marquer comme lu</button>}
            {notifications.length ? (
              <ul className="max-h-80 overflow-y-auto">
                {notifications.map((item) => (
                  <li key={item.id} className="border-b border-slate-800 last:border-b-0">
                    <button type="button" role="menuitem" onClick={() => { setOpen(null); item.onClick(); }} className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-slate-800/60">
                      <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read === false ? 'bg-blue-500' : 'bg-transparent'}`} />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-xs text-white ${item.read === false ? 'font-bold' : 'font-semibold'}`}>{item.title}</span>
                        <span className="mt-0.5 line-clamp-2 block break-words text-[11px] text-slate-400">{item.subtitle}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="px-4 py-8 text-center text-xs text-slate-500">{notificationsEmpty}</p>}
            {onSeeAllNotifications && <button type="button" onClick={() => { setOpen(null); onSeeAllNotifications(); }} className="block w-full border-t border-slate-800 px-4 py-3 text-center text-xs font-bold text-blue-400 transition hover:bg-slate-800/60">{seeAllLabel}</button>}
          </div>
        )}
      </div>

      <div className="relative">
        <button type="button" aria-label="Menu du compte" aria-expanded={open === 'user'} onClick={() => setOpen(open === 'user' ? null : 'user')} className="flex h-11 items-center gap-2.5 rounded-xl px-1 transition hover:bg-slate-800/60 sm:px-2">
          <span className="hidden min-w-0 text-right sm:block">
            <span className="block max-w-[10rem] truncate text-xs font-bold text-white">{name}</span>
            <span className="block max-w-[10rem] truncate text-[10px] text-slate-400">{roleLabel}</span>
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-xs font-black text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials(name)}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open === 'user' ? 'rotate-180' : ''}`} />
        </button>
        {open === 'user' && (
          <div role="menu" className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 py-1 shadow-2xl">
            <div className="border-b border-slate-800 px-4 py-3 sm:hidden">
              <p className="truncate text-xs font-bold text-white">{name}</p>
              <p className="truncate text-[11px] text-slate-400">{roleLabel}</p>
            </div>
            {menuItems.map((item) => (
              <button key={item.label} type="button" role="menuitem" onClick={() => { setOpen(null); item.onClick(); }} className={`flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold transition hover:bg-slate-800/60 ${item.danger ? 'text-rose-300 hover:text-rose-200' : 'text-slate-300 hover:text-white'}`}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
