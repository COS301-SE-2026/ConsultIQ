import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService, CommitResult } from './week.service';
import { TimeService, LocalDate } from './time.service';
import { WeekContainer, Change, Interval, Task, ValidateContext, NewTask, Issue } from '../dto/scheduler.dto';

@Injectable()
export class TaskService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly weekService: WeekService,
        private readonly timeService: TimeService,
    ) { }

    // -----------------------------------------------------------------
    // Core lifecycle
    // -----------------------------------------------------------------

    public async create(
        consultantId: string,
        weekStart: LocalDate,
        dto: NewTask,
        expectedVersion?: number,
    ): Promise<CommitResult> {
        const week = await this.weekService.getWeek(consultantId, weekStart);

        const change: Change = {
            type: 'create_task',
            task: dto,
            origin: 'user',
            window: this.getWeekWindow(week),
        };

        const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };
        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    public async update(taskId: string, dto: Partial<Task>, expectedVersion?: number): Promise<CommitResult> {
        const { week, task } = await this.loadTaskContext(taskId);

        const change: Change = {
            type: 'update_task',
            taskId,
            patch: dto,
            origin: 'user',
            window: this.taskDayWindow(week, task),
        } as Change;

        const ctx: ValidateContext = { bumpedEntityIds: [taskId], allocations: [] };
        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    public async deleteTask(taskId: string, expectedVersion?: number): Promise<CommitResult> {
        const { week, task } = await this.loadTaskContext(taskId);

        const change: Change = {
            type: 'delete_task',
            taskId,
            origin: 'user',
            window: this.taskDayWindow(week, task),
        } as Change;

        const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };
        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    // -----------------------------------------------------------------
    // Status & subtasks
    // -----------------------------------------------------------------

    public async setStatus(
        taskId: string,
        status: Task['status'],
        expectedVersion?: number,
    ): Promise<CommitResult> {
        const { week, task } = await this.loadTaskContext(taskId);

        const change: Change = {
            type: 'set_status',
            taskId,
            status,
            origin: 'user',
            window: this.taskDayWindow(week, task),
        } as Change;

        const ctx: ValidateContext = { bumpedEntityIds: [taskId], allocations: [] };
        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    public async toggleSubtask(
        taskId: string,
        subtaskId: string,
        expectedVersion?: number,
    ): Promise<CommitResult> {
        const { week, task } = await this.loadTaskContext(taskId);

        const change: Change = {
            type: 'toggle_subtask',
            taskId,
            subtaskId,
            origin: 'user',
            window: this.taskDayWindow(week, task),
        } as Change;

        const ctx: ValidateContext = { bumpedEntityIds: [taskId], allocations: [] };
        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    // -----------------------------------------------------------------
    // Advanced operations
    // -----------------------------------------------------------------

    public async split(taskId: string, atMinutes: number, expectedVersion?: number): Promise<CommitResult> {
        const { week, task } = await this.loadTaskContext(taskId);

        if (task.status !== 'Ready') {
            throw new BadRequestException(`Cannot split task in status: ${task.status}`);
        }
        if (task.tMax < 120 || atMinutes < 60 || task.tMax - atMinutes < 60) {
            throw new BadRequestException('Split rejected: both halves must be at least 60 minutes.');
        }
        this.assertSplitBoundaryClearOfSubtasks(task, atMinutes);

        const change: Change = {
            type: 'split_task',
            taskId,
            atMinutes,
            origin: 'user',
            window: this.taskDayWindow(week, task),
        } as Change;

        const ctx: ValidateContext = { bumpedEntityIds: [taskId], allocations: [] };
        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    public async acceptDeadlineMiss(taskId: string, expectedVersion?: number): Promise<CommitResult> {
        const { week, task } = await this.loadTaskContext(taskId);

        const change: Change = {
            type: 'accept_deadline_miss',
            taskId,
            origin: 'user',
            window: this.taskDayWindow(week, task),
        } as Change;

        const ctx: ValidateContext = { bumpedEntityIds: [taskId], allocations: [] };
        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    public async deferToNextWeek(taskIds: string[], expectedVersion?: number): Promise<CommitResult> {
        if (!taskIds.length) {
            throw new BadRequestException('No task ids provided');
        }

        const tasks = await this.prisma.schedulerTask.findMany({ where: { id: { in: taskIds } } });
        if (tasks.length !== taskIds.length) {
            const found = new Set(tasks.map((t) => t.id));
            throw new NotFoundException(`Task(s) not found: ${taskIds.filter((id) => !found.has(id)).join(', ')}`);
        }

        const distinctWeekIds = new Set(tasks.map((t) => t.weekId));
        if (distinctWeekIds.size > 1) {

            throw new BadRequestException('deferToNextWeek: all tasks must belong to the same week');
        }

        const { week: sourceWeek } = await this.loadTaskContext(taskIds[0]);

        if (expectedVersion !== undefined && expectedVersion !== sourceWeek.version) {

            const stale = await this.weekService.getWeek(sourceWeek.consultantId, sourceWeek.weekStart as LocalDate);
            return {
                ok: false,
                value: stale,
                violations: [{
                    level: 'violation',
                    code: 'VERSION_CONFLICT',
                    message: 'The week was modified by another request. Please refresh and try again.',
                }],
                warnings: [],
                infos: [],
            };
        }

        const nextWeekStart = DateTime.fromISO(sourceWeek.weekStart as string, { zone: 'utc' })
            .plus({ days: 7 }).toFormat('yyyy-MM-dd');


        const nextWeekStartDt = DateTime.fromISO(nextWeekStart, { zone: 'utc' });
        const deadlineWarnings = tasks
            .filter((t) => t.deadline && DateTime.fromJSDate(t.deadline, { zone: 'utc' }) < nextWeekStartDt)
            .map((t): Issue => ({
                level: 'warning' as const,
                code: 'DEADLINE_INFEASIBLE',
                message: `Task ${t.id}'s deadline falls before the week it's being deferred into.`,
                entityIds: [t.id],
            }));


        await this.prisma.$transaction(async (tx) => {
            let nextWeek = await tx.schedulerWeek.findUnique({
                where: { consultantId_weekStart: { consultantId: sourceWeek.consultantId, weekStart: new Date(nextWeekStart) } },
            });
            if (!nextWeek) {
                nextWeek = await tx.schedulerWeek.create({
                    data: {
                        consultantId: sourceWeek.consultantId,
                        weekStart: new Date(nextWeekStart),
                        timezone: sourceWeek.timezone,
                        lastCommittedAt: new Date(),
                        sourceOfLastChange: 'system'
                    },
                });
            }

            await tx.schedulerTask.updateMany({
                where: { id: { in: taskIds } },
                data: { weekId: nextWeek.id, placement: 'unplaced', unplacedReason: null },
            });

            const slots = await tx.schedulerSlot.findMany({
                where: { weekId: sourceWeek.id },
            });
            const slotTasks = await tx.schedulerSlotTask.findMany({
                where: { slotId: { in: slots.map((slot) => slot.id) } },
            });

            for (const slot of slots) {
                const currentTaskIds = slotTasks
                    .filter((slotTask) => slotTask.slotId === slot.id)
                    .map((slotTask) => slotTask.taskId);
                if (currentTaskIds.length === 0) continue;

                const remainingTaskIds = currentTaskIds.filter((id: string) => !taskIds.includes(id));
                if (remainingTaskIds.length === currentTaskIds.length) {
                    continue;
                }

                if (remainingTaskIds.length === 0) {
                    // If no tasks remain in this slot, delete the slot entirely
                    await tx.schedulerSlot.delete({ where: { id: slot.id } });
                } else {
                    // Otherwise, remove the specific task associations from the join table
                    await tx.schedulerSlotTask.deleteMany({
                        where: {
                            slotId: slot.id,
                            taskId: { in: taskIds },
                        },
                    });
                }
            }

            await tx.schedulerWeek.updateMany({
                where: { id: { in: [sourceWeek.id, nextWeek.id] } },
                data: { version: { increment: 1 } },
            });
        });

        const updated = await this.weekService.getWeek(sourceWeek.consultantId, sourceWeek.weekStart as LocalDate);
        return { ok: true, value: updated, violations: [], warnings: deadlineWarnings, infos: [] };
    }

    public async placeUnplaced(taskIds: string[], expectedVersion?: number): Promise<CommitResult> {
        if (!taskIds.length) throw new BadRequestException('No tasks provided');

        const tasks = await this.prisma.schedulerTask.findMany({ where: { id: { in: taskIds } } });
        if (tasks.length !== taskIds.length) {
            const found = new Set(tasks.map((t) => t.id));
            throw new NotFoundException(`Task(s) not found: ${taskIds.filter((id) => !found.has(id)).join(', ')}`);
        }
        if (new Set(tasks.map((t) => t.weekId)).size > 1) {
            throw new BadRequestException('placeUnplaced: all tasks must belong to the same week');
        }

        const { week } = await this.loadTaskContext(taskIds[0]);
        const window = this.getWeekWindow(week);

        const validIds: string[] = [];
        for (const id of taskIds) {
            const dryRun = await this.weekService.dryRun(week.id, {
                type: 'place_unplaced',
                taskIds: [id],
                origin: 'system',
                window,
            } as Change);
            if (dryRun.ok) validIds.push(id);
        }

        if (!validIds.length) {
            throw new BadRequestException('No tasks could be placed during dry-run validation.');
        }

        const change: Change = { type: 'place_unplaced', taskIds: validIds, origin: 'user', window } as Change;
        const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };

        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    private async loadTaskContext(taskId: string): Promise<{ week: WeekContainer; task: Task }> {
        const dbTask = await this.prisma.schedulerTask.findUnique({
            where: { id: taskId },
            include: { week: true },
        });
        if (!dbTask) throw new NotFoundException(`Task ${taskId} not found`);

        const weekStart = dbTask.week.weekStart.toISOString().split('T')[0] as LocalDate;
        const week = await this.weekService.getWeek(dbTask.week.consultantId, weekStart);
        const task = week.tasks.find((t) => t.id === taskId);

        if (!task) {

            throw new NotFoundException(`Task ${taskId} found in DB but missing from its week's container`);
        }

        return { week, task };
    }

    private getWeekWindow(week: WeekContainer): Interval {
        const start = this.timeService.localDateToInstant(week.weekStart, week.timezone);
        const nextMonday = DateTime.fromISO(week.weekStart as string, { zone: 'utc' })
            .plus({ days: 7 }).toFormat('yyyy-MM-dd') as LocalDate;
        return { start, end: this.timeService.localDateToInstant(nextMonday, week.timezone) };
    }

    private dayWindow(instant: string, timezone: string): Interval {
        const day = this.timeService.localDate(instant, timezone);
        const nextDay = DateTime.fromISO(day as string, { zone: 'utc' }).plus({ days: 1 }).toFormat('yyyy-MM-dd') as LocalDate;
        return {
            start: this.timeService.localDateToInstant(day, timezone),
            end: this.timeService.localDateToInstant(nextDay, timezone),
        };
    }


    private taskDayWindow(week: WeekContainer, task: Task): Interval {
        const existing = week.slots.filter((s) => s.taskIds?.includes(task.id));
        const anchor = existing.length > 0
            ? existing.reduce((earliest, s) => (s.start < earliest ? s.start : earliest), existing[0].start)
            : new Date().toISOString();

        return this.dayWindow(anchor, week.timezone);
    }

    private assertSplitBoundaryClearOfSubtasks(task: Task, atMinutes: number): void {
        const subtasks = task.subtasks as unknown as Array<{
            id: string;
            estimate?: number;
            durationMinutes?: number
        }>;

        if (!subtasks?.length) return;

        let cursor = 0;
        for (const st of subtasks) {
            const dur = st.estimate ?? st.durationMinutes ?? 0;
            const start = cursor;
            const end = cursor + dur;

            if (atMinutes > start && atMinutes < end) {
                throw new BadRequestException(
                    'Split point ' + atMinutes + 'm falls inside subtask ' + st.id + ' (' + start + '-' + end + 'm).'
                );
            }
            cursor = end;
        }
    }
}