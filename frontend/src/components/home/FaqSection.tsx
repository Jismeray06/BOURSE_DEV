import { ChevronDown } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { contactInfo } from './contactInfo';

const FAQ = [
  { q: 'Qui peut utiliser cette plateforme ?', a: "Les étudiants des établissements de l'Université de Mahajanga qui souhaitent déposer une demande de bourse. Le nouvel étudiant inscrit en première année avec un baccalauréat antérieur n'est pas éligible et ne doit pas soumettre de demande." },
  { q: 'Comment créer mon compte ?', a: "Cliquez sur « Faire une demande », puis « Créer un compte » : renseignez votre nom, votre adresse e-mail et un mot de passe d'au moins 8 caractères, ou utilisez votre compte Google. Un e-mail de vérification vous est envoyé ; le lien qu'il contient est valable 24 heures." },
  { q: 'Comment déposer une demande de bourse ?', a: "Connectez-vous, puis suivez les cinq étapes : établissement, niveau, parcours, quitus, pièces justificatives. Une fois le quitus vérifié et les pièces obligatoires téléversées, cliquez sur « Finaliser le dépôt »." },
  { q: 'Comment savoir si mon dossier est complet ?', a: "Le bouton « Finaliser le dépôt » ne devient actif que lorsque le quitus est vérifié et que toutes les pièces obligatoires sont téléversées. Un compteur indique le nombre de pièces obligatoires déjà déposées." },
  { q: "Puis-je modifier ma demande après l'avoir commencée ?", a: "Oui, tant qu'elle n'est pas soumise : elle est enregistrée en brouillon à chaque étape. Une fois soumise, elle n'est plus modifiable. Si elle est refusée, vous pouvez la modifier puis la soumettre à nouveau." },
  { q: 'Comment suivre ma demande ?', a: "Depuis votre espace personnel, onglet « Mon dossier » : l'état du dossier, vos informations et la liste de vos pièces y sont affichés. Vous recevez aussi un e-mail lors de la décision de la scolarité." },
  { q: 'Que faire si mon dossier est refusé ou incomplet ?', a: "Ouvrez « Mon dossier » pour lire le motif du refus, corrigez les informations ou les pièces concernées, puis soumettez de nouveau le dossier. En cas de doute, rapprochez-vous de la scolarité." },
  { q: "Que faire si j'ai oublié mon mot de passe ?", a: "La réinitialisation en libre-service n'est pas encore disponible. Contactez le service de scolarité pour être aidé." },
  { q: "Que faire si je ne reçois pas l'e-mail de vérification ?", a: "Vérifiez vos courriers indésirables, puis, sur la page de connexion, utilisez le bouton « Renvoyer l'e-mail de vérification ». Si le problème persiste, contactez l'assistance." },
];

export function FaqSection() {
  const { email } = contactInfo.scolarite;
  return (
    <SectionShell id="faq" title="Questions fréquentes" description="Les réponses aux questions les plus courantes avant, pendant et après le dépôt de votre dossier.">
      <div className="mx-auto max-w-3xl divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {FAQ.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 marker:hidden dark:text-white [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.a}</p>
          </details>
        ))}
      </div>
      {email && (
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Votre question n&apos;y figure pas ? Écrivez à la scolarité : <a className="underline" href={`mailto:${email}`}>{email}</a>
        </p>
      )}
    </SectionShell>
  );
}
