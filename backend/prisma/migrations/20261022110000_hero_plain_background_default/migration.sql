-- Fond du bandeau d'accueil : couleur unie par défaut au lieu des photos du campus.
-- Les sites ayant leurs propres photos de fond gardent leur réglage.
ALTER TABLE "SiteSettings" ALTER COLUMN "heroBackgroundType" SET DEFAULT 'COLOR';
UPDATE "SiteSettings" SET "heroBackgroundType" = 'COLOR' WHERE "heroBackgroundType" = 'IMAGE' AND cardinality("heroBackgroundImages") = 0;
