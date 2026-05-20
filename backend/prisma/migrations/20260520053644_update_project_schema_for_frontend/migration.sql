/*
  Warnings:

  - You are about to drop the column `profileStatus` on the `consultants` table. All the data in the column will be lost.
  - You are about to drop the column `isMandatory` on the `project_skills` table. All the data in the column will be lost.
  - You are about to drop the column `minimumCompetency` on the `project_skills` table. All the data in the column will be lost.
  - You are about to drop the column `clientBillingBudget` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `requiredAllocationPercentage` on the `projects` table. All the data in the column will be lost.
  - Added the required column `competency` to the `project_skills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `years` to the `project_skills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addressLine1` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `allocation` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `budget` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postalCode` to the `projects` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "consultants" DROP COLUMN "profileStatus";

-- AlterTable
ALTER TABLE "project_skills" DROP COLUMN "isMandatory",
DROP COLUMN "minimumCompetency",
ADD COLUMN     "competency" "CompetencyLevel" NOT NULL,
ADD COLUMN     "mandatory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "years" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "clientBillingBudget",
DROP COLUMN "requiredAllocationPercentage",
ADD COLUMN     "addressLine1" TEXT NOT NULL,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "allocation" INTEGER NOT NULL,
ADD COLUMN     "budget" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "postalCode" TEXT NOT NULL,
ADD COLUMN     "suburb" TEXT;

-- DropEnum
DROP TYPE "ProfileStatus"; -- NOSONAR
