ALTER TABLE "EnrolledStudent" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "EnrolledStudent_userId_key" ON "EnrolledStudent"("userId");

ALTER TABLE "EnrolledStudent"
  ADD CONSTRAINT "EnrolledStudent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Lie les comptes et les fiches de démonstration déjà existants via leur e-mail.
UPDATE "EnrolledStudent" AS enrollment
SET "userId" = "User"."id"
FROM "User"
WHERE enrollment."email" IS NOT NULL
  AND LOWER(enrollment."email") = LOWER("User"."email");
