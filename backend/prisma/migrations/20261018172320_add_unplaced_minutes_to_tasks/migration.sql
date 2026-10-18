-- AlterTable
ALTER TABLE "scheduler_tasks" ADD COLUMN     "unplaced_available_minutes" INTEGER,
ADD COLUMN     "unplaced_needed_minutes" INTEGER;
