-- AlterTable
ALTER TABLE "SiteSettings" DROP COLUMN "heroBackgroundImage";
ALTER TABLE "SiteSettings" ADD COLUMN "heroBackgroundImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
