-- CreateEnum
CREATE TYPE "MatchRunStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "PlacementStatus" ADD VALUE 'TERMINATED';

-- AlterTable
ALTER TABLE "consultancy_scoring_configs" ADD COLUMN     "hardExclusionEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "project_scoring_overrides" ADD COLUMN     "hardExclusionEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MatchRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "executedByUserId" TEXT NOT NULL,
    "status" "MatchRunStatus" NOT NULL,
    "totalConsultantsScored" INTEGER NOT NULL DEFAULT 0,
    "totalConsultantsExcluded" INTEGER NOT NULL DEFAULT 0,
    "configurationSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchRunResult" (
    "id" TEXT NOT NULL,
    "matchRunId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "factorScores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchRunResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MatchRun" ADD CONSTRAINT "MatchRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRun" ADD CONSTRAINT "MatchRun_executedByUserId_fkey" FOREIGN KEY ("executedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRunResult" ADD CONSTRAINT "MatchRunResult_matchRunId_fkey" FOREIGN KEY ("matchRunId") REFERENCES "MatchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRunResult" ADD CONSTRAINT "MatchRunResult_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
