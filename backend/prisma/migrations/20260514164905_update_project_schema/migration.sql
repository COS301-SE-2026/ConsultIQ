/*
  Warnings:

  - The primary key for the `Project` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `budget` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `project` on the `Project` table. All the data in the column will be lost.
  - Added the required column `city` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientBillingBudget` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientName` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDate` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectName` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `province` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requiredAllocationPercentage` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('Open', 'InProgress', 'Closed');

-- DropForeignKey
ALTER TABLE "ProjectManager" DROP CONSTRAINT "ProjectManager_projectID_fkey";

-- DropForeignKey
ALTER TABLE "ProjectPlacement" DROP CONSTRAINT "ProjectPlacement_projectID_fkey";

-- DropForeignKey
ALTER TABLE "ProjectSkills" DROP CONSTRAINT "ProjectSkills_projectID_fkey";

-- AlterTable
ALTER TABLE "Project" DROP CONSTRAINT "Project_pkey",
DROP COLUMN "budget",
DROP COLUMN "duration",
DROP COLUMN "location",
DROP COLUMN "project",
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "clientBillingBudget" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "clientName" TEXT NOT NULL,
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "projectName" TEXT NOT NULL,
ADD COLUMN     "province" TEXT NOT NULL,
ADD COLUMN     "requiredAllocationPercentage" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'Open',
ALTER COLUMN "projectID" DROP DEFAULT,
ALTER COLUMN "projectID" SET DATA TYPE TEXT,
ADD CONSTRAINT "Project_pkey" PRIMARY KEY ("projectID");
DROP SEQUENCE "Project_projectID_seq";

-- AlterTable
ALTER TABLE "ProjectManager" ALTER COLUMN "projectID" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ProjectPlacement" ALTER COLUMN "projectID" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ProjectSkills" ALTER COLUMN "projectID" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "ProjectSkills" ADD CONSTRAINT "ProjectSkills_projectID_fkey" FOREIGN KEY ("projectID") REFERENCES "Project"("projectID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectManager" ADD CONSTRAINT "ProjectManager_projectID_fkey" FOREIGN KEY ("projectID") REFERENCES "Project"("projectID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPlacement" ADD CONSTRAINT "ProjectPlacement_projectID_fkey" FOREIGN KEY ("projectID") REFERENCES "Project"("projectID") ON DELETE RESTRICT ON UPDATE CASCADE;
