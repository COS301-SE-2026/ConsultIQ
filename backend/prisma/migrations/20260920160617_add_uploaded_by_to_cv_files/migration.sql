-- AlterTable
ALTER TABLE "cv_files" ADD COLUMN     "uploadedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "cv_files_uploadedByUserId_securityReviewStatus_idx" ON "cv_files"("uploadedByUserId", "securityReviewStatus");
