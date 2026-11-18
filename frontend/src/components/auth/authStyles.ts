// Styles communs aux pages d'authentification (connexion, mot de passe oublié, réinitialisation) :
// fond blanc en mode clair, effet « verre » sur le fond sombre en mode sombre.
export const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-white/90';
export const fieldCls = 'w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/25 dark:bg-white/10 dark:text-white dark:backdrop-blur-sm dark:placeholder:text-white/50 dark:focus:border-cyan-300/70 dark:focus:bg-white/15 dark:focus:ring-cyan-300/30';
export const iconCls = 'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/60';
export const eyeCls = 'absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-slate-400 hover:text-slate-700 dark:text-white/60 dark:hover:text-white';
export const linkCls = 'cursor-pointer font-medium text-blue-600 hover:underline dark:text-sky-300';
export const primaryButtonCls = 'flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60';
export const errorBoxCls = 'rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100';
export const successBoxCls = 'rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100';
