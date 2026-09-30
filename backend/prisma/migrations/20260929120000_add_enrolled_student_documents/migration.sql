CREATE TABLE "EnrolledStudentDocument" (
  "id" TEXT NOT NULL,
  "enrolledStudentId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storageName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EnrolledStudentDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnrolledStudentDocument_storageName_key" ON "EnrolledStudentDocument"("storageName");
CREATE UNIQUE INDEX "EnrolledStudentDocument_enrolledStudentId_type_key" ON "EnrolledStudentDocument"("enrolledStudentId", "type");
CREATE INDEX "EnrolledStudentDocument_enrolledStudentId_idx" ON "EnrolledStudentDocument"("enrolledStudentId");

ALTER TABLE "EnrolledStudentDocument"
  ADD CONSTRAINT "EnrolledStudentDocument_enrolledStudentId_fkey"
  FOREIGN KEY ("enrolledStudentId") REFERENCES "EnrolledStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
