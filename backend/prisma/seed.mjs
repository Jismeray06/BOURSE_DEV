import { PrismaClient, UserRole } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

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
    update: { fullName: process.env.ISSTM_MANAGER_NAME ?? 'Responsable ISSTM', passwordHash: managerPasswordHash, role: UserRole.ETABLISSEMENT },
    create: { email: managerEmail, fullName: process.env.ISSTM_MANAGER_NAME ?? 'Responsable ISSTM', passwordHash: managerPasswordHash, role: UserRole.ETABLISSEMENT },
  });

  const enrolledStudents = [
    ['ISSTM-2026-001', 'RASOLO Marie', 'marie.rasolo@isstm.mg', '034 12 345 01', 'FEMININ', 'Licence 1 (L1)', 'Génie Logiciel & Base de Données'],
    ['ISSTM-2026-002', 'ANDRIAMBOLOLONA Tiana', 'tiana.andriambololona@isstm.mg', '034 12 345 02', 'FEMININ', 'Licence 1 (L1)', "Systèmes d’Information & Réseaux"],
    ['ISSTM-2026-003', 'RAKOTO Andry', 'andry.rakoto@isstm.mg', '034 12 345 03', 'MASCULIN', 'Licence 1 (L1)', 'Génie Logiciel & Base de Données'],
    ['ISSTM-2026-004', 'RAVELO Hanta', 'hanta.ravelo@isstm.mg', '034 12 345 04', 'FEMININ', 'Licence 2 (L2)', "Systèmes d’Information & Réseaux"],
    ['ISSTM-2026-005', 'RANDRIANARISOA Feno', 'feno.randrianarisoa@isstm.mg', '034 12 345 05', 'MASCULIN', 'Licence 2 (L2)', 'Génie Logiciel & Base de Données'],
    ['ISSTM-2026-006', 'RAZAFINDRAKOTO Miora', 'miora.razafindrakoto@isstm.mg', '034 12 345 06', 'FEMININ', 'Licence 2 (L2)', "Systèmes d’Information & Réseaux"],
    ['ISSTM-2026-007', 'ANDRIANJAFY Tojo', 'tojo.andrianjafy@isstm.mg', '034 12 345 07', 'MASCULIN', 'Licence 3 (L3)', 'Génie Logiciel & Base de Données'],
    ['ISSTM-2026-008', 'RABEARIMANANA Soa', 'soa.rabearimanana@isstm.mg', '034 12 345 08', 'FEMININ', 'Licence 3 (L3)', "Systèmes d’Information & Réseaux"],
    ['ISSTM-2026-009', 'RAKOTONDRABE Lova', 'lova.rakotondrabe@isstm.mg', '034 12 345 09', 'MASCULIN', 'Licence 3 (L3)', 'Génie Logiciel & Base de Données'],
    ['ISSTM-2026-010', 'RAZANAKOTO Noro', 'noro.razanakoto@isstm.mg', '034 12 345 10', 'FEMININ', 'Master 1 (M1)', 'Génie Logiciel & Base de Données'],
    ['ISSTM-2026-011', 'RANDRIAMBOLOLONA Kanto', 'kanto.randriambololona@isstm.mg', '034 12 345 11', 'MASCULIN', 'Master 1 (M1)', "Systèmes d’Information & Réseaux"],
    ['ISSTM-2026-012', 'RAMAROSON Zo', 'zo.ramaroson@isstm.mg', '034 12 345 12', 'FEMININ', 'Master 1 (M1)', 'Génie Logiciel & Base de Données'],
    ['ISSTM-2026-013', 'RAKOTOARISOA Faly', 'faly.rakotoarisoa@isstm.mg', '034 12 345 13', 'MASCULIN', 'Master 2 (M2)', "Systèmes d’Information & Réseaux"],
    ['ISSTM-2026-014', 'ANDRIANASOLO Mamy', 'mamy.andrianasolo@isstm.mg', '034 12 345 14', 'FEMININ', 'Master 2 (M2)', 'Génie Logiciel & Base de Données'],
    ['ISSTM-2026-015', 'RABENJA Bodo', 'bodo.rabenja@isstm.mg', '034 12 345 15', 'FEMININ', 'Licence 1 (L1)', 'Génie Logiciel & Base de Données'],
    ['ISSTM-2026-016', 'RATSIMBA Hery', 'hery.ratsimba@isstm.mg', '034 12 345 16', 'MASCULIN', 'Licence 1 (L1)', "Systèmes d’Information & Réseaux"],
    ['ISSTM-2026-017', 'RANAIVOSON Tovo', 'tovo.ranaivoson@isstm.mg', '034 12 345 17', 'MASCULIN', 'Licence 2 (L2)', 'Génie Logiciel & Base de Données'],
    ['ISSTM-2026-018', 'RAKOTONIAINA Saholy', 'saholy.rakotoniaina@isstm.mg', '034 12 345 18', 'FEMININ', 'Licence 2 (L2)', "Systèmes d’Information & Réseaux"],
    ['ISSTM-2026-019', 'RABEARISOA Aina', 'aina.rabearisoa@isstm.mg', '034 12 345 19', 'FEMININ', 'Licence 3 (L3)', 'Génie Logiciel & Base de Données'],
    ['ISSTM-2026-020', 'ANDRIAMIHARISOA Solo', 'solo.andriamiharisoa@isstm.mg', '034 12 345 20', 'MASCULIN', 'Master 2 (M2)', "Systèmes d’Information & Réseaux"],
  ];
  const studentsByRegistrationNumber = new Map();
  for (const [registrationNumber, fullName, studentEmail, phone, gender, level, program] of enrolledStudents) {
    const student = await prisma.enrolledStudent.upsert({
      where: { registrationNumber },
      update: { fullName, email: studentEmail, phone, gender, level, program, establishment: 'ISSTM', active: true },
      create: { registrationNumber, fullName, email: studentEmail, phone, gender, level, program, establishment: 'ISSTM' },
    });
    studentsByRegistrationNumber.set(registrationNumber, student);
    await prisma.user.upsert({
      where: { email: studentEmail },
      update: {
        fullName,
        passwordHash: studentPasswordHash,
        role: UserRole.ETUDIANT,
        establishment: 'ISSTM',
        level,
        program,
      },
      create: {
        fullName,
        email: studentEmail,
        passwordHash: studentPasswordHash,
        role: UserRole.ETUDIANT,
        establishment: 'ISSTM',
        level,
        program,
      },
    });
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

  console.log(`Compte administrateur prêt : ${email}`);
  console.log(`Compte responsable ISSTM prêt : ${managerEmail}`);
  console.log(`${enrolledStudents.length} étudiants fictifs ISSTM prêts.`);
  console.log(`Comptes étudiants fictifs : [e-mail ISSTM] / ${process.env.ISSTM_STUDENT_PASSWORD ?? 'ISSTM-2026!'}`);
  console.log(`${createdQuitus} quitus fictif(s) ISSTM ajouté(s).`);
}

main().finally(() => prisma.$disconnect());
