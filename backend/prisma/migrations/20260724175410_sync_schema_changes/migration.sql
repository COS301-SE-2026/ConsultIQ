-- AlterTable
ALTER TABLE "MatchRun" ADD COLUMN     "totalConsultantsPlaced" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MatchRunResult" ADD COLUMN     "isPlaced" BOOLEAN NOT NULL DEFAULT false;
