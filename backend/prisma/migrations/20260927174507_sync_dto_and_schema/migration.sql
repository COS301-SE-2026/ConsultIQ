-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CalendarEntryOrigin" ADD VALUE 'system';
ALTER TYPE "CalendarEntryOrigin" ADD VALUE 'public-holiday';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IdempotencyKeyType" ADD VALUE 'rollover';
ALTER TYPE "IdempotencyKeyType" ADD VALUE 'mark-incomplete';

-- AlterTable
ALTER TABLE "scheduler_tasks" ADD COLUMN     "deadline_miss_accepted" BOOLEAN NOT NULL DEFAULT false;
