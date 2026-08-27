-- CreateEnum
CREATE TYPE "CvParsingMethod" AS ENUM ('AI_ASSISTED', 'RULE_BASED');

-- AlterTable
ALTER TABLE "cv_files" ADD COLUMN     "parsingMethod" "CvParsingMethod" NOT NULL DEFAULT 'RULE_BASED';
