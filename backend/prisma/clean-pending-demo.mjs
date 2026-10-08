// Retire uniquement les anciens dossiers de démonstration encore à traiter.
// Les comptes, quitus, brouillons et décisions déjà prises sont conservés.
// Par défaut : aperçu. Ajouter --apply pour effectuer le nettoyage avec sauvegarde.
import { PrismaClient, RegistrationStatus } from '@prisma/client';
import dotenv from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

const prisma = new PrismaClient();
const pendingStatuses = [RegistrationStatus.SOUMIS, RegistrationStatus.EN_REVISION];
const pendingDemoWhere = {
  status: { in: pendingStatuses },
  OR: [
    { user: { email: { endsWith: '@demo.univ-mahajanga.mg' } } },
    { quitus: { code: { in: ['ISSTM-2026-DEMO-001', 'ISSTM-2026-DEMO-002', 'ISSTM-2026-DEMO-003'] } } },
  ],
};

async function main() {
  if (!process.argv.includes('--apply')) {
    const [demo, allPending, withDocuments] = await Promise.all([
      prisma.enrollmentApplication.count({ where: pendingDemoWhere }),
      prisma.enrollmentApplication.count({ where: { status: { in: pendingStatuses } } }),
      prisma.enrollmentApplication.count({ where: { ...pendingDemoWhere, documents: { some: {} } } }),
    ]);
    console.log(JSON.stringify({ pendingDemoApplications: demo, otherPendingApplications: allPending - demo, demoApplicationsWithDocuments: withDocuments }));
    console.log('Pour effectuer le nettoyage : npm run prisma:clean:pending-demo -- --apply');
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const applications = await tx.enrollmentApplication.findMany({
      where: pendingDemoWhere,
      include: { documents: true, user: { select: { id: true, email: true, registrationStatus: true } } },
    });
    if (!applications.length) return { removed: 0, backup: null };
    if (applications.some((application) => application.documents.length)) {
      throw new Error('Nettoyage interrompu : un dossier de démonstration contient des pièces téléversées. Vérifiez ces dossiers avant de les retirer.');
    }

    const userIds = applications.map((application) => application.userId);
    const notifications = await tx.notification.findMany({ where: { userId: { in: userIds }, type: 'APPLICATION_SUBMITTED' } });
    const backupDirectory = new URL('../.local-backups/', import.meta.url);
    const backupFile = new URL(`pending-demo-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, backupDirectory);
    await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
    await writeFile(backupFile, JSON.stringify({ savedAt: new Date().toISOString(), applications, notifications }, null, 2), { flag: 'wx', mode: 0o600 });

    const removed = await tx.enrollmentApplication.deleteMany({ where: { ...pendingDemoWhere, id: { in: applications.map((application) => application.id) } } });
    await tx.user.updateMany({ where: { id: { in: userIds }, registrationStatus: { in: pendingStatuses } }, data: { registrationStatus: RegistrationStatus.BROUILLON } });
    await tx.notification.deleteMany({ where: { id: { in: notifications.map((notification) => notification.id) } } });
    return { removed: removed.count, backup: fileURLToPath(backupFile) };
  }, { isolationLevel: 'Serializable', timeout: 20_000 });

  const remainingPending = await prisma.enrollmentApplication.count({ where: { status: { in: pendingStatuses } } });
  console.log(JSON.stringify({ ...result, remainingPending }));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
