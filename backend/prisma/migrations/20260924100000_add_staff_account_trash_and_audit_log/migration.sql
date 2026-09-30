-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('STAFF_ACCOUNT_CREATED', 'STAFF_ACCOUNT_STATUS_CHANGED', 'STAFF_ACCOUNT_NAME_UPDATED', 'STAFF_ACCOUNT_PASSWORD_RESET', 'STAFF_ACCOUNT_TRASHED', 'STAFF_ACCOUNT_RESTORED', 'STAFF_ACCOUNT_PURGED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLogEntry_createdAt_idx" ON "AuditLogEntry"("createdAt");
