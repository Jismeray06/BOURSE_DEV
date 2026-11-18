-- Journal d'audit : un étudiant a modifié son propre nom.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACCOUNT_NAME_CHANGED';
