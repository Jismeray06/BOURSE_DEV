CREATE TABLE "ApplicationDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storageName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApplicationDocument_storageName_key" ON "ApplicationDocument"("storageName");
CREATE UNIQUE INDEX "ApplicationDocument_applicationId_type_key" ON "ApplicationDocument"("applicationId", "type");
CREATE INDEX "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");

ALTER TABLE "ApplicationDocument"
  ADD CONSTRAINT "ApplicationDocument_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "EnrollmentApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;