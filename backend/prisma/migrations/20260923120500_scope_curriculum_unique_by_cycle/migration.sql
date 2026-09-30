-- DropIndex
DROP INDEX "EstablishmentCurriculumOption_establishment_type_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "EstablishmentCurriculumOption_establishment_type_name_cycle_key" ON "EstablishmentCurriculumOption"("establishment", "type", "name", "cycle");
