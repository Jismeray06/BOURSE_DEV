// Applique les parcours réels de l'ISSTM à la base : ajoute/réactive les vrais parcours et DÉSACTIVE
// (sans supprimer) les autres parcours de l'établissement. Relançable sans doublons.
//   npm run prisma:curriculum:isstm
//   npm run prisma:curriculum:isstm -- "Nom exact de l'établissement"   (si le nom de l'ISSTM a été changé)
import { CurriculumOptionType, PrismaClient } from '@prisma/client';
import { ISSTM_PARCOURS } from './isstm-curriculum.mjs';

const prisma = new PrismaClient();

async function main() {
  const given = process.argv.slice(2).find((value) => !value.startsWith('--'));
  const establishment = given ?? (await prisma.establishment.findFirst({ where: { name: { startsWith: 'ISSTM' } }, select: { name: true } }))?.name ?? 'ISSTM';
  console.log(`Établissement : ${establishment}`);

  const wanted = new Set();
  for (const parcours of ISSTM_PARCOURS) {
    for (const cycle of parcours.cycles) {
      wanted.add(`${parcours.name}|${cycle}`);
      await prisma.establishmentCurriculumOption.upsert({
        where: { establishment_type_name_cycle: { establishment, type: CurriculumOptionType.PARCOURS, name: parcours.name, cycle } },
        update: { active: true },
        create: { establishment, type: CurriculumOptionType.PARCOURS, name: parcours.name, cycle },
      });
    }
  }

  const others = (await prisma.establishmentCurriculumOption.findMany({ where: { establishment, type: CurriculumOptionType.PARCOURS, active: true } }))
    .filter((option) => !wanted.has(`${option.name}|${option.cycle}`));
  if (others.length) {
    await prisma.establishmentCurriculumOption.updateMany({ where: { id: { in: others.map((option) => option.id) } }, data: { active: false } });
  }
  console.log(`${wanted.size} parcours actifs (${ISSTM_PARCOURS.length} parcours, par cycle).`);
  console.log(`${others.length} ancien(s) parcours désactivé(s) : ${others.map((option) => `${option.name} [${option.cycle}]`).join(', ') || 'aucun'}`);
}

main().finally(() => prisma.$disconnect());
