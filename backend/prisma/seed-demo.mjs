// Données fictives pour rendre les tableaux de bord vivants (étudiants et dossiers de bourse
// répartis sur tous les établissements). N'écrase aucun compte existant.
//   npm run prisma:seed:demo           → ajoute les données (relançable sans doublons)
//   npm run prisma:seed:demo -- --clean → supprime uniquement ces données fictives
import { PrismaClient, RegistrationStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_DOMAIN = '@demo.univ-mahajanga.mg';

const NIVEAUX = ['Licence 1 (L1)', 'Licence 2 (L2)', 'Licence 3 (L3)', 'Master 1 (M1)', 'Master 2 (M2)'];
const FIRST_NAMES = ['Aina', 'Tiana', 'Hery', 'Mamy', 'Soa', 'Lova', 'Fanja', 'Tojo', 'Noro', 'Kanto', 'Faly', 'Mialy', 'Rado', 'Hanta', 'Zo', 'Andry', 'Miora', 'Toky', 'Voahangy', 'Njaka'];
const LAST_NAMES = ['RAKOTO', 'RANDRIA', 'RABE', 'RAZAFY', 'ANDRIAMANANA', 'RAVELO', 'RASOLOFO', 'RAHARISON', 'RAMANANA', 'RAZAKA', 'ANDRIANTSOA', 'RAKOTOMALALA', 'RANAIVO', 'RATSIMBAZAFY', 'RAJAONARISON'];

// [établissement, nombre d'étudiants, parcours]
const PLAN = [
  ['ENS', 14, ['Sciences de l\'éducation', 'Lettres modernes', 'Mathématiques']],
  ['Faculté de Médecine', 22, ['Médecine générale', 'Sciences infirmières']],
  ['FSTE', 11, ['Biologie & Environnement', 'Chimie', 'Physique']],
  ['IOSTM', 6, ['Océanographie', 'Pêche & aquaculture']],
  ['ILC-SS', 9, ['Études anglophones & linguistique', 'Communication']],
  ['ISSTM', 6, ['Génie Informatique (GI)', 'Génie Civil (GCIVIL)', 'Génie Industriel (GIND)']],
  ['IUGM', 17, ['Gestion & administration', 'Comptabilité', 'Marketing']],
  ['IUTAM', 8, ['Génie électrique', 'Maintenance industrielle']],
  ['EDSP', 5, ['Droit privé & des affaires', 'Sciences politiques']],
  ['École de Pharmacie', 12, ['Pharmacie', 'Biologie médicale']],
  ['ELCI', 4, ['Langues & civilisations', 'Tourisme']],
];

// Générateur pseudo-aléatoire déterministe : mêmes données à chaque exécution.
let state = 20261001;
const random = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (items) => items[Math.floor(random() * items.length)];

// Répartition des statuts : surtout des dossiers traités, quelques-uns en attente.
function pickStatus() {
  const value = random();
  if (value < 0.2) return RegistrationStatus.BROUILLON;
  if (value < 0.42) return RegistrationStatus.SOUMIS;
  if (value < 0.5) return RegistrationStatus.EN_REVISION;
  if (value < 0.82) return RegistrationStatus.VALIDE;
  return RegistrationStatus.REFUSE;
}

async function clean() {
  const result = await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_DOMAIN } } });
  console.log(`${result.count} compte(s) fictif(s) supprimé(s) (dossiers associés inclus).`);
}

async function main() {
  if (process.argv.includes('--clean')) return clean();

  const reviewer = await prisma.user.findFirst({ where: { role: UserRole.SCOLARITE_CENTRALE, deletedAt: null }, select: { id: true } });
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let created = 0;
  let index = 0;

  for (const [establishment, count, programs] of PLAN) {
    for (let i = 0; i < count; i += 1) {
      index += 1;
      const fullName = `${pick(LAST_NAMES)} ${pick(FIRST_NAMES)}`;
      const email = `etudiant${String(index).padStart(3, '0')}${DEMO_DOMAIN}`;
      if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) continue;

      const level = pick(NIVEAUX);
      const program = pick(programs);
      const status = pickStatus();
      const createdAt = new Date(now - Math.floor(random() * 60) * day);
      const submittedAt = status === RegistrationStatus.BROUILLON ? null : new Date(createdAt.getTime() + Math.floor(random() * 5 + 1) * day);
      const decided = status === RegistrationStatus.VALIDE || status === RegistrationStatus.REFUSE;

      // Pas de mot de passe : ces comptes de démonstration ne peuvent pas se connecter.
      const user = await prisma.user.create({
        data: { fullName, email, emailVerified: true, role: UserRole.ETUDIANT, establishment, level, program, registrationStatus: status, createdAt },
      });
      await prisma.enrollmentApplication.create({
        data: {
          userId: user.id, establishment, level, program, status, submittedAt, createdAt,
          ...(decided ? {
            reviewedAt: new Date(submittedAt.getTime() + day),
            reviewedById: reviewer?.id,
            reviewNote: status === RegistrationStatus.REFUSE ? 'Dossier incomplet : pièces illisibles (données fictives).' : null,
          } : {}),
        },
      });
      created += 1;
    }
  }
  console.log(`${created} étudiant(s) et dossier(s) fictif(s) ajouté(s) sur ${PLAN.length} établissements.`);
  console.log(`Pour les retirer : npm run prisma:seed:demo -- --clean`);
}

main().finally(() => prisma.$disconnect());
