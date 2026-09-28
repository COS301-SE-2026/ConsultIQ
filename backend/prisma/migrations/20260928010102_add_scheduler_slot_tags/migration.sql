-- AlterTable
ALTER TABLE "scheduler_slots" ADD COLUMN     "tags" JSONB NOT NULL DEFAULT '[]';
