-- CreateTable
CREATE TABLE "QuitusChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quitusId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuitusChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuitusChallenge_userId_quitusId_idx" ON "QuitusChallenge"("userId", "quitusId");

-- CreateIndex
CREATE INDEX "QuitusChallenge_expiresAt_idx" ON "QuitusChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "QuitusChallenge" ADD CONSTRAINT "QuitusChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuitusChallenge" ADD CONSTRAINT "QuitusChallenge_quitusId_fkey" FOREIGN KEY ("quitusId") REFERENCES "Quitus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
