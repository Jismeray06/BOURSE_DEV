-- Corbeille : un étudiant supprimé reste en base (restaurable) avec sa date de suppression.
ALTER TABLE "EnrolledStudent" ADD COLUMN "deletedAt" TIMESTAMP(3);
