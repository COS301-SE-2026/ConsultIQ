-- CreateEnum
CREATE TYPE "GapSeverity" AS ENUM ('COVERED', 'AT_RISK', 'CRITICAL');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "skillGapSeverity" "GapSeverity" NOT NULL DEFAULT 'COVERED';
