import { SectionShell } from './SectionShell';

// Statuts réels du backend (enum RegistrationStatus).
const STATUSES = [
  { code: 'BROUILLON', label: 'Brouillon', text: "Le dossier est en cours de constitution : il n'a pas encore été soumis. Vous pouvez le modifier.", tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { code: 'SOUMIS', label: 'Soumis', text: "Le dossier a été enregistré et attend d'être examiné. Il n'est plus modifiable.", tone: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  { code: 'EN_REVISION', label: 'En révision', text: 'Le dossier est actuellement examiné par la scolarité centrale.', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  { code: 'VALIDE', label: 'Validé', text: "Le dossier a été validé par la scolarité centrale. Il ne s'agit pas d'une attribution de bourse.", tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { code: 'REFUSE', label: 'Refusé', text: 'Le dossier n\'a pas été retenu. Le motif est consultable dans « Mon dossier » et le dossier peut être modifié puis soumis à nouveau.', tone: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300' },
];

export function StatusesSection() {
  return (
    <SectionShell id="statuts" title="Comprendre le suivi de votre dossier" description="Votre dossier passe par les états suivants, visibles à tout moment dans votre espace personnel.">
      <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATUSES.map((status) => (
          <li key={status.code} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{status.text}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
