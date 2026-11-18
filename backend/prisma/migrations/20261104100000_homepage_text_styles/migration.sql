-- Mise en forme (couleur, police, taille…) des textes de la page d'accueil, par clé de texte.
ALTER TABLE "SiteSettings" ADD COLUMN "homepageStyles" JSONB NOT NULL DEFAULT '{}';
