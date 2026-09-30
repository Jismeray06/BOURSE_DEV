-- CreateEnum
CREATE TYPE "HeroBackgroundType" AS ENUM ('COLOR', 'GRADIENT', 'IMAGE');

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "primaryColor" TEXT NOT NULL DEFAULT '#0b3b60',
    "secondaryColor" TEXT NOT NULL DEFAULT '#fbbf24',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "heroBackgroundType" "HeroBackgroundType" NOT NULL DEFAULT 'IMAGE',
    "heroBackgroundImage" TEXT,
    "heroOverlayOpacity" INTEGER NOT NULL DEFAULT 60,
    "heroTitle" TEXT NOT NULL DEFAULT 'Votre inscription universitaire, simple et accessible.',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Déposez votre dossier d''inscription en ligne en quelques étapes. Sélectionnez votre établissement, validez votre quitus et suivez l''avancement de votre dossier.',
    "ctaPrimaryLabel" TEXT NOT NULL DEFAULT 'Se connecter',
    "ctaPrimaryLink" TEXT NOT NULL DEFAULT '/login',
    "ctaSecondaryLabel" TEXT NOT NULL DEFAULT 'Commencer mon inscription',
    "ctaSecondaryLink" TEXT NOT NULL DEFAULT '/login',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
