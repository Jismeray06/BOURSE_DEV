-- CreateTable
CREATE TABLE "Establishment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Establishment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Establishment_name_key" ON "Establishment"("name");

-- Établissements proposés jusqu'ici dans la page étudiant
INSERT INTO "Establishment" ("id", "name", "position", "updatedAt")
SELECT gen_random_uuid()::text, "name", "position", CURRENT_TIMESTAMP
FROM (VALUES
  ('ENS', 1), ('Faculté de Médecine', 2), ('FSTE', 3), ('IOSTM', 4), ('ILC-SS', 5), ('ISSTM', 6),
  ('IUGM', 7), ('IUTAM', 8), ('EDSP', 9), ('École de Pharmacie', 10), ('ELCI', 11)
) AS defaults("name", "position");
