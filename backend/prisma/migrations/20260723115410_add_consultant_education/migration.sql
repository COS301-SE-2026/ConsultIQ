/*
  Warnings:

  - You are about to drop the column `fileData` on the `cv_files` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `cv_files` table. All the data in the column will be lost.
  - Added the required column `fileSize` to the `cv_files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3Key` to the `cv_files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3Url` to the `cv_files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `cv_files` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'UPLOADING', 'UPLOADED', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED');

-- AlterTable
ALTER TABLE "cv_files" DROP COLUMN "fileData",
DROP COLUMN "status",
ADD COLUMN     "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "fileSize" INTEGER NOT NULL,
ADD COLUMN     "parsedData" JSONB,
ADD COLUMN     "rawText" TEXT,
ADD COLUMN     "s3Key" TEXT NOT NULL,
ADD COLUMN     "s3Url" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uploadStatus" "UploadStatus" NOT NULL DEFAULT 'UPLOADED';

-- CreateTable
CREATE TABLE "consultant_education" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultant_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "performed_by_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_value" TEXT NOT NULL,
    "new_value" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "consultant_education" ADD CONSTRAINT "consultant_education_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "consultants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
