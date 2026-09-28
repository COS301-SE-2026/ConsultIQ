-- CreateEnum
CREATE TYPE "SecurityReviewStatus" AS ENUM ('NONE', 'PENDING', 'CLEARED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CV_SECURITY_CLEARED';
ALTER TYPE "AuditAction" ADD VALUE 'CV_SECURITY_REJECTED';

-- AlterEnum
ALTER TYPE "ExtractionStatus" ADD VALUE 'SECURITY_REJECTED';

-- AlterTable
ALTER TABLE "consultants" ADD COLUMN     "hadSecurityFlagOnIntake" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "cv_files" ADD COLUMN     "securityReviewStatus" "SecurityReviewStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "securityReviewedAt" TIMESTAMP(3),
ADD COLUMN     "securityReviewedBy" TEXT;

-- CreateIndex
CREATE INDEX "cv_files_securityReviewStatus_idx" ON "cv_files"("securityReviewStatus");

-- CreateIndex
CREATE INDEX "cv_files_consultantId_securityReviewStatus_idx" ON "cv_files"("consultantId", "securityReviewStatus");
