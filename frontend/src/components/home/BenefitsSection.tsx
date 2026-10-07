import { FolderOpen, LineChart, Lock, Smartphone } from 'lucide-react';
import { SectionShell } from './SectionShell';

const BENEFITS = [
  { icon: Smartphone, title: 'Démarche numérique', text: 'Effectuez les principales démarches depuis votre téléphone ou votre ordinateur.' },
  { icon: LineChart, title: 'Suivi du dossier', text: "Consultez l'état de votre demande directement depuis votre espace personnel." },
  { icon: FolderOpen, title: 'Dossier centralisé', text: 'Retrouvez vos informations et vos pièces justificatives dans un même espace.' },
  { icon: Lock, title: 'Accès protégé', text: 'Votre dossier est accessible depuis votre compte personnel.' },
];

export function BenefitsSection() {
  return (
    <SectionShell title="Une démarche plus simple et plus accessible">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((benefit) => (
          <div key={benefit.title} className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[#0b3b60] dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">
              <benefit.icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-[family-name:var(--font-heading)] text-base font-semibold text-slate-900 dark:text-white">{benefit.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{benefit.text}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
