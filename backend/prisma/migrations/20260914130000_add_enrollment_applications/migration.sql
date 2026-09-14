CREATE TABLE "EnrollmentApplication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "establishment" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "program" TEXT NOT NULL,
  "quitusId" TEXT,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'BROUILLON',
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EnrollmentApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnrollmentApplication_userId_key" ON "EnrollmentApplication"("userId");
CREATE UNIQUE INDEX "EnrollmentApplication_quitusId_key" ON "EnrollmentApplication"("quitusId");

ALTER TABLE "EnrollmentApplication"
  ADD CONSTRAINT "EnrollmentApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnrollmentApplication"
  ADD CONSTRAINT "EnrollmentApplication_quitusId_fkey"
  FOREIGN KEY ("quitusId") REFERENCES "Quitus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
