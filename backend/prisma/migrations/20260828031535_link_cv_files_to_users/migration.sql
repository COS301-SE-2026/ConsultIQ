/*
  Warnings:

  - Added the required column `userId` to the `cv_files` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "cv_files" DROP CONSTRAINT "cv_files_consultantId_fkey";

-- AlterTable
ALTER TABLE "cv_files" ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "consultantId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "cv_files" ADD CONSTRAINT "cv_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_files" ADD CONSTRAINT "cv_files_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "consultants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
