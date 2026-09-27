-- CreateEnum
CREATE TYPE "BlockMobility" AS ENUM ('fluid', 'pinned');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('Ready', 'InProgress', 'Done');

-- CreateEnum
CREATE TYPE "TaskPlacementStatus" AS ENUM ('placed', 'unplaced');

-- CreateEnum
CREATE TYPE "SlotKind" AS ENUM ('task', 'batch');

-- CreateEnum
CREATE TYPE "CalendarEntryType" AS ENUM ('meeting', 'training', 'travel', 'personal', 'leave', 'ad-hoc');

-- CreateEnum
CREATE TYPE "CalendarEntryOrigin" AS ENUM ('user', 'feed');

-- CreateEnum
CREATE TYPE "IdempotencyKeyType" AS ENUM ('daily-rollover', 'slot-rollover');

-- CreateTable
CREATE TABLE "scheduler_weeks" (
    "id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "week_start" DATE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "last_committed_at" TIMESTAMP(3) NOT NULL,
    "source_of_last_change" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduler_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduler_project_blocks" (
    "id" TEXT NOT NULL,
    "week_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "placement_id" TEXT,
    "allocated_minutes" INTEGER NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "mobility" "BlockMobility" NOT NULL,
    "user_sized" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "scheduler_project_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduler_tasks" (
    "id" TEXT NOT NULL,
    "week_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "t_min" INTEGER NOT NULL,
    "t_max" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3),
    "urgency" INTEGER NOT NULL,
    "complexity" INTEGER NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "depends_on" JSONB NOT NULL DEFAULT '[]',
    "split_from_id" TEXT,
    "carried_over" BOOLEAN NOT NULL DEFAULT false,
    "placement" "TaskPlacementStatus" NOT NULL,
    "unplaced_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduler_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduler_subtasks" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "estimate" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "scheduler_subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduler_slots" (
    "id" TEXT NOT NULL,
    "week_id" TEXT NOT NULL,
    "kind" "SlotKind" NOT NULL,
    "block_id" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "day_span" INTEGER NOT NULL,

    CONSTRAINT "scheduler_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduler_slot_tasks" (
    "slot_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,

    CONSTRAINT "scheduler_slot_tasks_pkey" PRIMARY KEY ("slot_id","task_id")
);

-- CreateTable
CREATE TABLE "scheduler_slot_subtasks" (
    "slot_id" TEXT NOT NULL,
    "subtask_id" TEXT NOT NULL,

    CONSTRAINT "scheduler_slot_subtasks_pkey" PRIMARY KEY ("slot_id","subtask_id")
);

-- CreateTable
CREATE TABLE "scheduler_calendar_entries" (
    "id" TEXT NOT NULL,
    "week_id" TEXT NOT NULL,
    "type" "CalendarEntryType" NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "origin" "CalendarEntryOrigin" NOT NULL DEFAULT 'user',

    CONSTRAINT "scheduler_calendar_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduler_issue_dismissals" (
    "id" TEXT NOT NULL,
    "week_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dismissed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduler_issue_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduler_idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "IdempotencyKeyType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduler_idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduler_pending_changes" (
    "id" TEXT NOT NULL,
    "week_id" TEXT NOT NULL,
    "change" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduler_pending_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduler_weeks_consultant_id_week_start_key" ON "scheduler_weeks"("consultant_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "scheduler_issue_dismissals_week_id_code_key" ON "scheduler_issue_dismissals"("week_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "scheduler_idempotency_keys_key_type_key" ON "scheduler_idempotency_keys"("key", "type");

-- AddForeignKey
ALTER TABLE "scheduler_project_blocks" ADD CONSTRAINT "scheduler_project_blocks_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "scheduler_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler_tasks" ADD CONSTRAINT "scheduler_tasks_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "scheduler_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler_subtasks" ADD CONSTRAINT "scheduler_subtasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "scheduler_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler_slots" ADD CONSTRAINT "scheduler_slots_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "scheduler_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler_slot_tasks" ADD CONSTRAINT "scheduler_slot_tasks_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "scheduler_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler_slot_tasks" ADD CONSTRAINT "scheduler_slot_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "scheduler_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler_slot_subtasks" ADD CONSTRAINT "scheduler_slot_subtasks_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "scheduler_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler_slot_subtasks" ADD CONSTRAINT "scheduler_slot_subtasks_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "scheduler_subtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler_calendar_entries" ADD CONSTRAINT "scheduler_calendar_entries_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "scheduler_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler_issue_dismissals" ADD CONSTRAINT "scheduler_issue_dismissals_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "scheduler_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler_pending_changes" ADD CONSTRAINT "scheduler_pending_changes_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "scheduler_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
