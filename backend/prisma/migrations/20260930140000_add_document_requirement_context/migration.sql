CREATE TYPE "DocumentRequirementContext" AS ENUM ('INSCRIPTION', 'CANDIDATURE');

ALTER TABLE "DocumentRequirement"
  ADD COLUMN "context" "DocumentRequirementContext" NOT NULL DEFAULT 'INSCRIPTION';

DROP INDEX "DocumentRequirement_establishment_cycle_type_key";
DROP INDEX "DocumentRequirement_establishment_cycle_active_idx";

CREATE UNIQUE INDEX "DocumentRequirement_establishment_context_cycle_type_key"
  ON "DocumentRequirement"("establishment", "context", "cycle", "type");
CREATE INDEX "DocumentRequirement_establishment_context_cycle_active_idx"
  ON "DocumentRequirement"("establishment", "context", "cycle", "active");
