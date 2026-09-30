-- CreateEnum
CREATE TYPE "CurriculumCycle" AS ENUM ('LICENCE', 'MASTER');

-- CreateEnum
CREATE TYPE "EnrollmentQuality" AS ENUM ('PASSANT', 'REDOUBLANT');

-- AlterTable
ALTER TABLE "EnrolledStudent" ADD COLUMN     "previousProgram" TEXT,
ADD COLUMN     "quality" "EnrollmentQuality";

-- AlterTable
ALTER TABLE "EstablishmentCurriculumOption" ADD COLUMN     "cycle" "CurriculumCycle" NOT NULL DEFAULT 'LICENCE';

-- CreateTable
CREATE TABLE "EstablishmentSettings" (
    "establishment" TEXT NOT NULL,
    "mention" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstablishmentSettings_pkey" PRIMARY KEY ("establishment")
);

-- DataMigration: les niveaux Master existants basculent sur le cycle MASTER
UPDATE "EstablishmentCurriculumOption" SET "cycle" = 'MASTER' WHERE "type" = 'NIVEAU' AND "name" ILIKE '%master%';
