ALTER TYPE "UserRole" ADD VALUE 'SCOLARITE_CENTRALE';

ALTER TABLE "EnrollmentApplication"
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT;

ALTER TABLE "EnrollmentApplication"
  ADD CONSTRAINT "EnrollmentApplication_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
