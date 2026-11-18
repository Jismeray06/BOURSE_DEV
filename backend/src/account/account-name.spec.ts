import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AccountService } from './account.service.js';

function createService(applicationStatus: string | null) {
  const updates: unknown[] = [];
  const audits: unknown[] = [];
  const prisma = {
    enrollmentApplication: { findUnique: async () => (applicationStatus ? { status: applicationStatus } : null) },
    user: { update: async (args: unknown) => { updates.push(args); return {}; } },
    auditLogEntry: { create: async (args: unknown) => { audits.push(args); return {}; } },
  };
  const service = new AccountService(prisma as never, {} as never, {} as never);
  return { service, updates, audits };
}
const student = { id: 'u1', fullName: 'Jean Rakoto', email: 'jean@univ.mg', role: UserRole.ETUDIANT };

describe('modification du nom par l’étudiant', () => {
  it('modifie le nom, le nettoie et l’inscrit au journal', async () => {
    const { service, updates, audits } = createService(null);
    const result = await service.changeName(student, '  Jean-Marc   RAKOTO ');
    expect(result.fullName).toBe('Jean-Marc RAKOTO');
    expect(updates).toHaveLength(1);
    expect(audits).toHaveLength(1);
  });

  it('reste possible avec un brouillon ou après un refus', async () => {
    await expect(createService('BROUILLON').service.changeName(student, 'Jean Andry')).resolves.toBeDefined();
    await expect(createService('REFUSE').service.changeName(student, 'Jean Andry')).resolves.toBeDefined();
  });

  it('est refusé une fois le dossier déposé, en révision ou validé', async () => {
    for (const status of ['SOUMIS', 'EN_REVISION', 'VALIDE']) {
      const { service, updates } = createService(status);
      await expect(service.changeName(student, 'Jean Andry')).rejects.toThrow(BadRequestException);
      expect(updates).toHaveLength(0);
    }
  });

  it('refuse un nom vide, trop court, avec des chevrons ou des chiffres, ou identique', async () => {
    const { service } = createService(null);
    for (const name of ['', 'A', '<script>alert(1)</script>', 'Jean 2', 'Jean Rakoto']) {
      await expect(service.changeName(student, name)).rejects.toThrow(BadRequestException);
    }
  });

  it('est réservé aux étudiants', async () => {
    const { service } = createService(null);
    await expect(service.changeName({ ...student, role: UserRole.ADMIN }, 'Nouveau Nom')).rejects.toThrow(BadRequestException);
  });
});
