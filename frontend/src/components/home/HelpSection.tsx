'use client';

import { Clock, Mail, MapPin, Phone, Wrench } from 'lucide-react';
import { EditPencil, HomeText, useContactInfo, useHomeEdit } from './HomepageEditor';
import { SectionShell } from './SectionShell';

export function HelpSection() {
  const { scolarite, support } = useContactInfo();
  const { editContact } = useHomeEdit();
  const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800';
  return (
    <SectionShell
      id="aide"
      title={<HomeText contentKey="help.1" />}
      description={<HomeText contentKey="help.2" />}
      tone="muted"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <a href="#faq" className={button}><HomeText contentKey="help.3" /></a>
          {scolarite.email && <a href={`mailto:${scolarite.email}`} className={button}><Mail className="h-4 w-4" aria-hidden /><HomeText contentKey="help.4" /></a>}
          {scolarite.phone && <a href={`tel:${scolarite.phone.replace(/\s/g, '')}`} className={button}><Phone className="h-4 w-4" aria-hidden /><HomeText contentKey="help.5" /></a>}
          {support.email && <a href={`mailto:${support.email}?subject=Problème technique – demande de bourse`} className={button}><Wrench className="h-4 w-4" aria-hidden /><HomeText contentKey="help.6" /></a>}
        </div>
        <div className="flex justify-center"><EditPencil label="Modifier les coordonnées" onClick={editContact} /></div>
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
