import { ChevronRight, ClipboardList, Eye, FileUp, ReceiptText, UserPlus } from 'lucide-react';
import { SectionShell } from './SectionShell';
import type { SiteSettings } from '../siteSettings';

const STEPS = [
  { icon: UserPlus, short: 'Compte', title: 'Créez votre compte', text: "Inscrivez-vous avec votre adresse e-mail (ou votre compte Google) et confirmez-la grâce au lien reçu par e-mail." },
  { icon: ClipboardList, short: 'Parcours', title: 'Renseignez votre parcours', text: "Choisissez votre établissement, votre niveau d'études et votre parcours. Votre brouillon est enregistré à chaque étape." },
  { icon: ReceiptText, short: 'Quitus', title: 'Vérifiez votre quitus', text: "Saisissez le numéro de quitus délivré par votre établissement : il est vérifié immédiatement." },
  { icon: FileUp, short: 'Justificatifs', title: 'Transmettez vos justificatifs', text: "Ajoutez les pièces demandées (PDF, PNG ou JPG, 10 Mo maximum), puis finalisez le dépôt." },
  { icon: Eye, short: 'Suivi', title: 'Suivez votre demande', text: "Consultez l'état de votre dossier depuis votre espace personnel, y compris le motif en cas de refus." },
];

export function StepsSection({ settings }: { settings: SiteSettings }) {
  return (
    <SectionShell id="etapes" title="Votre demande en quelques étapes" description="Un parcours guidé en cinq étapes, du compte au suivi de votre dossier.">
      {/* Schéma synthétique : Compte → Parcours → Quitus → Justificatifs → Suivi */}
      <ol aria-label="Résumé des étapes" className="mx-auto mb-10 hidden max-w-4xl items-center justify-between lg:flex">
        {STEPS.map((step, index) => (
          <li key={step.short} className="flex items-center gap-3">
            <span className="rounded-full px-4 py-1.5 text-sm font-semibold text-white" style={{ backgroundColor: settings.primaryColor }}>{step.short}</span>
            {index < STEPS.length - 1 && <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden />}
          </li>
        ))}
      </ol>
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, index) => (
          <li key={step.short} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: settings.primaryColor }}>
                <step.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Étape {index + 1}</span>
            </div>
            <h3 className="mt-3 font-[family-name:var(--font-heading)] text-base font-semibold text-slate-900 dark:text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.text}</p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
