import { Clock, Mail, MapPin, Phone, Wrench } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { contactInfo } from './contactInfo';

export function HelpSection() {
  const { scolarite, support } = contactInfo;
  const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800';
  return (
    <SectionShell
      id="aide"
      title="Besoin d'aide ?"
      description="Vous rencontrez une difficulté lors de votre inscription ou du dépôt de votre demande ? Consultez les questions fréquentes ou contactez le service compétent."
      tone="muted"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <a href="#faq" className={button}>Consulter la FAQ</a>
          {scolarite.email && <a href={`mailto:${scolarite.email}`} className={button}><Mail className="h-4 w-4" aria-hidden />Contacter la scolarité</a>}
          {scolarite.phone && <a href={`tel:${scolarite.phone.replace(/\s/g, '')}`} className={button}><Phone className="h-4 w-4" aria-hidden />Appeler</a>}
          {support.email && <a href={`mailto:${support.email}?subject=Problème technique – demande de bourse`} className={button}><Wrench className="h-4 w-4" aria-hidden />Signaler un problème technique</a>}
        </div>
        {(scolarite.hours || scolarite.address) && (
          <ul className="mt-3 space-y-2 text-center text-sm text-slate-600 dark:text-slate-400">
            {scolarite.hours && <li className="flex items-center justify-center gap-2"><Clock className="h-4 w-4 shrink-0" aria-hidden />{scolarite.hours}</li>}
            {scolarite.address && <li className="flex items-center justify-center gap-2"><MapPin className="h-4 w-4 shrink-0" aria-hidden />{scolarite.address}</li>}
          </ul>
        )}
      </div>
    </SectionShell>
  );
}
