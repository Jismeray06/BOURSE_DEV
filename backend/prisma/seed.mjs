import { CurriculumCycle, CurriculumOptionType, DocumentRequirementContext, PrismaClient, RegistrationStatus, UserRole } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { ISSTM_PARCOURS } from './isstm-curriculum.mjs';

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@univ-mahajanga.mg').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'Changez-Moi-2026!';
  const passwordHash = await hashPassword(password);
  const studentPasswordHash = await hashPassword(process.env.ISSTM_STUDENT_PASSWORD ?? 'ISSTM-2026!');

  await prisma.user.upsert({
    where: { email },
    update: {
      fullName: process.env.ADMIN_NAME ?? 'Administrateur Université',
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    },
    create: {
      email,
      fullName: process.env.ADMIN_NAME ?? 'Administrateur Université',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const managerEmail = (process.env.ISSTM_MANAGER_EMAIL ?? 'responsable.isstm@univ-mahajanga.mg').trim().toLowerCase();
  const managerPasswordHash = await hashPassword(process.env.ISSTM_MANAGER_PASSWORD ?? 'ISSTM-2026!');
  const manager = await prisma.user.upsert({
    where: { email: managerEmail },
    update: { fullName: process.env.ISSTM_MANAGER_NAME ?? 'Responsable ISSTM', passwordHash: managerPasswordHash, role: UserRole.ADMIN_ETABLISSEMENT, establishment: 'ISSTM', emailVerified: true },
    create: { email: managerEmail, fullName: process.env.ISSTM_MANAGER_NAME ?? 'Responsable ISSTM', passwordHash: managerPasswordHash, role: UserRole.ADMIN_ETABLISSEMENT, establishment: 'ISSTM', emailVerified: true },
  });

  const curriculum = [
    ...['Licence 1 (L1)', 'Licence 2 (L2)', 'Licence 3 (L3)'].map((name) => [CurriculumOptionType.NIVEAU, name, CurriculumCycle.LICENCE]),
    ...['Master 1 (M1)', 'Master 2 (M2)'].map((name) => [CurriculumOptionType.NIVEAU, name, CurriculumCycle.MASTER]),
    // Parcours réels de l'ISSTM (voir isstm-curriculum.mjs) : un parcours par cycle où il est proposé.
    ...ISSTM_PARCOURS.flatMap((parcours) => parcours.cycles.map((cycle) => [CurriculumOptionType.PARCOURS, parcours.name, CurriculumCycle[cycle]])),
  ];
  for (const [type, name, cycle] of curriculum) {
    await prisma.establishmentCurriculumOption.upsert({
      where: { establishment_type_name_cycle: { establishment: 'ISSTM', type, name, cycle } },
      update: { active: true, cycle },
      create: { establishment: 'ISSTM', type, name, cycle },
    });
  }

  const documentRequirements = [
    [DocumentRequirementContext.INSCRIPTION, CurriculumCycle.LICENCE, 'photo', "Photo d'identité (4×4)"],
    [DocumentRequirementContext.INSCRIPTION, CurriculumCycle.LICENCE, 'carte_etudiant', "Photocopie de l'ancienne carte d'étudiant"],
    [DocumentRequirementContext.INSCRIPTION, CurriculumCycle.LICENCE, 'lettre_engagement', 'Lettre d’engagement (légalisée)'],
    [DocumentRequirementContext.INSCRIPTION, CurriculumCycle.LICENCE, 'certificat_residence', 'Certificat de résidence du répondant'],
    [DocumentRequirementContext.INSCRIPTION, CurriculumCycle.LICENCE, 'recu_versement', 'Reçu de versement'],
    [DocumentRequirementContext.INSCRIPTION, CurriculumCycle.MASTER, 'photo', "Photo d'identité (4×4)"],
    [DocumentRequirementContext.INSCRIPTION, CurriculumCycle.MASTER, 'certificat_residence', 'Certificat de résidence des parents'],
    [DocumentRequirementContext.INSCRIPTION, CurriculumCycle.MASTER, 'diplome_licence', 'Photocopie certifiée du diplôme/attestation de Licence'],
    [DocumentRequirementContext.INSCRIPTION, CurriculumCycle.MASTER, 'acte_naissance', 'Acte de naissance (moins de 3 mois)'],
    [DocumentRequirementContext.INSCRIPTION, CurriculumCycle.MASTER, 'cin', 'Photocopie CIN légalisée'],
    [DocumentRequirementContext.INSCRIPTION, CurriculumCycle.MASTER, 'recu_versement', 'Reçu de versement'],
    [DocumentRequirementContext.CANDIDATURE, CurriculumCycle.LICENCE, 'cin', "Photocopie EN COULEUR de la Carte d'Identité Nationale légalisée"],
    [DocumentRequirementContext.CANDIDATURE, CurriculumCycle.LICENCE, 'quitus', 'Quitus d’inscription ou de réinscription définitive pour l’Année Universitaire en cours'],
    [DocumentRequirementContext.CANDIDATURE, CurriculumCycle.LICENCE, 'residence', 'Certificat de résidence de l’étudiant à Mahajanga'],
    [DocumentRequirementContext.CANDIDATURE, CurriculumCycle.LICENCE, 'unemployment', 'Attestation de chômage délivrée par la Direction Régionale du Travail, de l’Emploi, de la Fonction Publique (FOP)'],
    [DocumentRequirementContext.CANDIDATURE, CurriculumCycle.LICENCE, 'bac', 'Photocopie certifiée du relevé de notes du Baccalauréat'],
  ];
  for (const [context, cycle, type, label] of documentRequirements) {
    await prisma.documentRequirement.upsert({
      where: { establishment_context_cycle_type: { establishment: 'ISSTM', context, cycle, type } },
      update: { label },
      create: { establishment: 'ISSTM', context, cycle, type, label },
    });
  }

  const centralEmail = (process.env.SCOLARITE_EMAIL ?? 'scolarite@univ-mahajanga.mg').trim().toLowerCase();
  const centralPasswordHash = await hashPassword(process.env.SCOLARITE_PASSWORD ?? 'Scolarite-2026!');
  await prisma.user.upsert({
    where: { email: centralEmail },
    update: { fullName: process.env.SCOLARITE_NAME ?? 'Scolarité Centrale', passwordHash: centralPasswordHash, role: UserRole.SCOLARITE_CENTRALE, emailVerified: true },
    create: { email: centralEmail, fullName: process.env.SCOLARITE_NAME ?? 'Scolarité Centrale', passwordHash: centralPasswordHash, role: UserRole.SCOLARITE_CENTRALE, emailVerified: true },
  });

  const enrolledStudents = [
    ['ISSTM-2026-001', 'RASOLO Marie', 'marie.rasolo@isstm.mg', '034 12 345 01', 'FEMININ', 'Licence 1 (L1)', 'Génie Informatique (GI)'],
    ['ISSTM-2026-002', 'ANDRIAMBOLOLONA Tiana', 'tiana.andriambololona@isstm.mg', '034 12 345 02', 'FEMININ', 'Licence 1 (L1)', 'Génie Civil (GCIVIL)'],
    ['ISSTM-2026-003', 'RAKOTO Andry', 'andry.rakoto@isstm.mg', '034 12 345 03', 'MASCULIN', 'Licence 1 (L1)', 'Génie Informatique (GI)'],
    ['ISSTM-2026-004', 'RAVELO Hanta', 'hanta.ravelo@isstm.mg', '034 12 345 04', 'FEMININ', 'Licence 2 (L2)', 'Génie Civil (GCIVIL)'],
    ['ISSTM-2026-005', 'RANDRIANARISOA Feno', 'feno.randrianarisoa@isstm.mg', '034 12 345 05', 'MASCULIN', 'Licence 2 (L2)', 'Génie Informatique (GI)'],
    ['ISSTM-2026-006', 'RAZAFINDRAKOTO Miora', 'miora.razafindrakoto@isstm.mg', '034 12 345 06', 'FEMININ', 'Licence 2 (L2)', 'Génie Civil (GCIVIL)'],
    ['ISSTM-2026-007', 'ANDRIANJAFY Tojo', 'tojo.andrianjafy@isstm.mg', '034 12 345 07', 'MASCULIN', 'Licence 3 (L3)', 'Génie Informatique (GI)'],
    ['ISSTM-2026-008', 'RABEARIMANANA Soa', 'soa.rabearimanana@isstm.mg', '034 12 345 08', 'FEMININ', 'Licence 3 (L3)', 'Génie Civil (GCIVIL)'],
    ['ISSTM-2026-009', 'RAKOTONDRABE Lova', 'lova.rakotondrabe@isstm.mg', '034 12 345 09', 'MASCULIN', 'Licence 3 (L3)', 'Génie Informatique (GI)'],
    ['ISSTM-2026-010', 'RAZANAKOTO Noro', 'noro.razanakoto@isstm.mg', '034 12 345 10', 'FEMININ', 'Master 1 (M1)', 'Génie Industriel (GIND)'],
    ['ISSTM-2026-011', 'RANDRIAMBOLOLONA Kanto', 'kanto.randriambololona@isstm.mg', '034 12 345 11', 'MASCULIN', 'Master 1 (M1)', 'Génie Biomédical (GB)'],
    ['ISSTM-2026-012', 'RAMAROSON Zo', 'zo.ramaroson@isstm.mg', '034 12 345 12', 'FEMININ', 'Master 1 (M1)', 'Génie Industriel (GIND)'],
    ['ISSTM-2026-013', 'RAKOTOARISOA Faly', 'faly.rakotoarisoa@isstm.mg', '034 12 345 13', 'MASCULIN', 'Master 2 (M2)', 'Génie Biomédical (GB)'],
    ['ISSTM-2026-014', 'ANDRIANASOLO Mamy', 'mamy.andrianasolo@isstm.mg', '034 12 345 14', 'FEMININ', 'Master 2 (M2)', 'Génie Industriel (GIND)'],
    ['ISSTM-2026-015', 'RABENJA Bodo', 'bodo.rabenja@isstm.mg', '034 12 345 15', 'FEMININ', 'Licence 1 (L1)', 'Génie Informatique (GI)'],
    ['ISSTM-2026-016', 'RATSIMBA Hery', 'hery.ratsimba@isstm.mg', '034 12 345 16', 'MASCULIN', 'Licence 1 (L1)', 'Génie Civil (GCIVIL)'],
    ['ISSTM-2026-017', 'RANAIVOSON Tovo', 'tovo.ranaivoson@isstm.mg', '034 12 345 17', 'MASCULIN', 'Licence 2 (L2)', 'Génie Informatique (GI)'],
    ['ISSTM-2026-018', 'RAKOTONIAINA Saholy', 'saholy.rakotoniaina@isstm.mg', '034 12 345 18', 'FEMININ', 'Licence 2 (L2)', 'Génie Civil (GCIVIL)'],
    ['ISSTM-2026-019', 'RABEARISOA Aina', 'aina.rabearisoa@isstm.mg', '034 12 345 19', 'FEMININ', 'Licence 3 (L3)', 'Génie Informatique (GI)'],
    ['ISSTM-2026-020', 'ANDRIAMIHARISOA Solo', 'solo.andriamiharisoa@isstm.mg', '034 12 345 20', 'MASCULIN', 'Master 2 (M2)', 'Génie Biomédical (GB)'],
  ];
  const studentsByRegistrationNumber = new Map();
  const usersByRegistrationNumber = new Map();
  for (const [registrationNumber, fullName, studentEmail, phone, gender, level, program] of enrolledStudents) {
    const student = await prisma.enrolledStudent.upsert({
      where: { registrationNumber },
      update: { fullName, email: studentEmail, phone, gender, level, program, establishment: 'ISSTM', active: true },
      create: { registrationNumber, fullName, email: studentEmail, phone, gender, level, program, establishment: 'ISSTM' },
    });
    studentsByRegistrationNumber.set(registrationNumber, student);
    const user = await prisma.user.upsert({
      where: { email: studentEmail },
      update: {
        fullName,
        passwordHash: studentPasswordHash,
        role: UserRole.ETUDIANT,
        emailVerified: true,
        establishment: 'ISSTM',
        level,
        program,
      },
      create: {
        fullName,
        email: studentEmail,
        passwordHash: studentPasswordHash,
        role: UserRole.ETUDIANT,
        emailVerified: true,
        establishment: 'ISSTM',
        level,
        program,
      },
    });
    await prisma.enrolledStudent.update({ where: { id: student.id }, data: { userId: user.id } });
    usersByRegistrationNumber.set(registrationNumber, user);
  }

  // Quitus de démonstration : ils permettent de tester immédiatement la
  // vérification d'un quitus pour les étudiants inscrits à l'ISSTM.
  const demoQuitus = [
    ['ISSTM-2026-DEMO-001', 'ISSTM-2026-001'],
    ['ISSTM-2026-DEMO-002', 'ISSTM-2026-002'],
    ['ISSTM-2026-DEMO-003', 'ISSTM-2026-003'],
    ['ISSTM-2026-DEMO-004', 'ISSTM-2026-004'],
    ['ISSTM-2026-DEMO-005', 'ISSTM-2026-005'],
    ['ISSTM-2026-DEMO-006', 'ISSTM-2026-006'],
    ['ISSTM-2026-DEMO-007', 'ISSTM-2026-007'],
    ['ISSTM-2026-DEMO-008', 'ISSTM-2026-008'],
  ];

  let createdQuitus = 0;
  for (const [code, registrationNumber] of demoQuitus) {
    const student = studentsByRegistrationNumber.get(registrationNumber);
    const existingQuitus = await prisma.quitus.findUnique({ where: { enrollmentId: student.id } });
    if (existingQuitus) continue;

    await prisma.quitus.upsert({
      where: { code },
      update: {
        studentName: student.fullName,
        studentEmail: student.email,
        establishment: 'ISSTM',
        issuedById: manager.id,
        enrollmentId: student.id,
      },
      create: {
        code,
        studentName: student.fullName,
        studentEmail: student.email,
        establishment: 'ISSTM',
        issuedById: manager.id,
        enrollmentId: student.id,
      },
    });
    createdQuitus += 1;
  }

  // Dossiers déjà finalisés, uniquement pour démontrer l'espace scolarité centrale.
  for (const registrationNumber of ['ISSTM-2026-001', 'ISSTM-2026-002', 'ISSTM-2026-003']) {
    const student = studentsByRegistrationNumber.get(registrationNumber);
    const user = usersByRegistrationNumber.get(registrationNumber);
    const quitus = await prisma.quitus.findUnique({ where: { enrollmentId: student.id } });
    if (!quitus) continue;
    await prisma.enrollmentApplication.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, establishment: student.establishment, level: student.level, program: student.program, quitusId: quitus.id, status: RegistrationStatus.SOUMIS, submittedAt: new Date() },
    });
    await prisma.user.update({ where: { id: user.id }, data: { registrationStatus: RegistrationStatus.SOUMIS } });
  }

  console.log(`Compte administrateur prêt : ${email}`);
  console.log(`Compte responsable ISSTM prêt : ${managerEmail}`);
  console.log(`Compte scolarité centrale prêt : ${centralEmail}`);
  console.log(`${enrolledStudents.length} étudiants fictifs ISSTM prêts.`);
  console.log(`Comptes étudiants fictifs : [e-mail ISSTM] / ${process.env.ISSTM_STUDENT_PASSWORD ?? 'ISSTM-2026!'}`);
  console.log(`${createdQuitus} quitus fictif(s) ISSTM ajouté(s).`);
  console.log('3 dossiers fictifs finalisés sont prêts pour la scolarité centrale.');
}

main().finally(() => prisma.$disconnect());
