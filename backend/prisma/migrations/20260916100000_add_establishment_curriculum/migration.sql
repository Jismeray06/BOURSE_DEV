CREATE TYPE "CurriculumOptionType" AS ENUM ('NIVEAU', 'PARCOURS');

CREATE TABLE "EstablishmentCurriculumOption" (
  "id" TEXT NOT NULL,
  "establishment" TEXT NOT NULL,
  "type" "CurriculumOptionType" NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EstablishmentCurriculumOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EstablishmentCurriculumOption_establishment_type_name_key"
  ON "EstablishmentCurriculumOption"("establishment", "type", "name");
CREATE INDEX "EstablishmentCurriculumOption_establishment_type_active_idx"
  ON "EstablishmentCurriculumOption"("establishment", "type", "active");
