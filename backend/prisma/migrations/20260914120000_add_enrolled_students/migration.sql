CREATE TYPE "Gender" AS ENUM ('FEMININ', 'MASCULIN', 'AUTRE');

CREATE TABLE "EnrolledStudent" (
  "id" TEXT NOT NULL,
  "registrationNumber" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT NOT NULL,
  "gender" "Gender" NOT NULL,
  "establishment" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "program" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnrolledStudent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnrolledStudent_registrationNumber_key" ON "EnrolledStudent"("registrationNumber");
CREATE UNIQUE INDEX "EnrolledStudent_email_key" ON "EnrolledStudent"("email");
ALTER TABLE "Quitus" ADD COLUMN "enrollmentId" TEXT;
CREATE UNIQUE INDEX "Quitus_enrollmentId_key" ON "Quitus"("enrollmentId");
ALTER TABLE "Quitus" ADD CONSTRAINT "Quitus_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "EnrolledStudent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
