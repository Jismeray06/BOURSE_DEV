CREATE TABLE "DocumentRequirement" (
  "id" TEXT NOT NULL,
  "establishment" TEXT NOT NULL,
  "cycle" "CurriculumCycle" NOT NULL DEFAULT 'LICENCE',
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentRequirement_establishment_cycle_type_key"
  ON "DocumentRequirement"("establishment", "cycle", "type");
CREATE INDEX "DocumentRequirement_establishment_cycle_active_idx"
  ON "DocumentRequirement"("establishment", "cycle", "active");
