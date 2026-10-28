-- Nouveau texte du bandeau d'accueil : les lignes encore égales aux anciens textes par défaut sont mises à jour.
ALTER TABLE "SiteSettings" ALTER COLUMN "heroTitle" SET DEFAULT 'Votre demande de bourse nationale, simple et 100 % en ligne.';
ALTER TABLE "SiteSettings" ALTER COLUMN "heroSubtitle" SET DEFAULT 'Déposez votre dossier, transmettez vos pièces justificatives et suivez son avancement, où que vous soyez.';
ALTER TABLE "SiteSettings" ALTER COLUMN "ctaSecondaryLabel" SET DEFAULT 'Faire une demande de bourse';
UPDATE "SiteSettings" SET "heroTitle" = 'Votre demande de bourse nationale, simple et 100 % en ligne.' WHERE "heroTitle" = 'Votre inscription universitaire, simple et accessible.';
UPDATE "SiteSettings" SET "heroSubtitle" = 'Déposez votre dossier, transmettez vos pièces justificatives et suivez son avancement, où que vous soyez.' WHERE "heroSubtitle" = 'Déposez votre dossier d''inscription en ligne en quelques étapes. Sélectionnez votre établissement, validez votre quitus et suivez l''avancement de votre dossier.';
UPDATE "SiteSettings" SET "ctaSecondaryLabel" = 'Faire une demande de bourse' WHERE "ctaSecondaryLabel" = 'Commencer mon inscription';
