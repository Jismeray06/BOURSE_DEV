ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ETABLISSEMENT';

CREATE TABLE "Quitus" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "studentName" TEXT NOT NULL,
  "studentEmail" TEXT,
  "establishment" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issuedById" TEXT,
  CONSTRAINT "Quitus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Quitus_code_key" ON "Quitus"("code");
ALTER TABLE "Quitus" ADD CONSTRAINT "Quitus_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
