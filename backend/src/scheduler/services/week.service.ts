import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeService, type LocalDate } from './time.service';
import { HolidayService } from './holiday.service';
import { PlacerService } from './placer.service';
import { ValidatorService } from './validator.service';
import {
    WeekContainer,
    Change,
    Issue,
    Task,
    Slot,
    ProjectBlock,
    Interval,
    ValidateContext,
    AllocationSummary,
} from '../dto/scheduler.dto';


export interface CommitResult {
    ok: boolean;
    value: WeekContainer;
    violations: Issue[];
    warnings: Issue[];
    infos: Issue[];
}

@Injectable()
export class WeekService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly timeService: TimeService,
        private readonly holidayService: HolidayService,
        private readonly placerService: PlacerService,
        private readonly validatorService: ValidatorService,
    ) { }

    // -----------------------------------------------------------------
    // GET /scheduler/weeks/:weekStart
    // -----------------------------------------------------------------

    public async getWeek(consultantId: string, weekStart: LocalDate): Promise<WeekContainer> {
        const dbWeek = await this.prisma.schedulerWeek.findUnique({
            where: {
                consultantId_weekStart: {
                    consultantId,
                    weekStart: new Date(`${weekStart}T00:00:00Z`)
                }
            },

            include: { blocks: true, tasks: true, calendarEntries: true, slots: true },
        });

        if (!dbWeek) {
            throw new NotFoundException(`Week starting ${weekStart} not found for consultant ${consultantId}`);
        }

        const holidays = (await this.holidayService.getForWeek(weekStart)) || [];
        const blocks = this.resolveBlocks(dbWeek);

        const week: WeekContainer = {
            id: dbWeek.id,
            consultantId: dbWeek.consultantId,
            timezone: dbWeek.timezone,
            weekStart: DateTime.fromJSDate(dbWeek.weekStart, { zone: 'utc' }).toFormat('yyyy-MM-dd') as LocalDate,
            version: dbWeek.version,

            lastCommittedAt: (dbWeek.lastCommittedAt ? dbWeek.lastCommittedAt.toISOString() : dbWeek.createdAt.toISOString()) as WeekContainer['lastCommittedAt'],
            sourceOfLastChange: dbWeek.sourceOfLastChange ?? 'system',
            createdAt: dbWeek.createdAt.toISOString() as WeekContainer['createdAt'],
            updatedAt: dbWeek.updatedAt.toISOString() as WeekContainer['updatedAt'],

            blocks,
            tasks: dbWeek.tasks as unknown as Task[],
            calendarEntries: dbWeek.calendarEntries as unknown as WeekContainer['calendarEntries'],
            holidays,
            slots: dbWeek.slots as unknown as Slot[],
            metadata: {} as WeekContainer['metadata'],
        };

        week.metadata = this.validatorService.summarize(week);

        return week;
    }

    private resolveBlocks(dbWeek: {
        blocks: Array<{
            manuallyResized?: boolean;
            allocation?: unknown;
            [key: string]: unknown;
        }>;
    }): ProjectBlock[] {
        return dbWeek.blocks.map((b) => {
            if (b.manuallyResized || b.allocation == null) {
                return b as unknown as ProjectBlock;
            }
            return {
                ...b,
                allocatedMinutes: this.placerService.blockMinutes(b.allocation as AllocationSummary),
            } as unknown as ProjectBlock;
        });
    }

    public async commit(
        week: WeekContainer,
        change: Change,
        ctx: ValidateContext,
        expectedVersion?: number,
        options?: { dryRun?: boolean },
    ): Promise<CommitResult> {

        if (expectedVersion !== undefined && expectedVersion !== week.version) {
            return this.versionConflictResult(week.id, week.consultantId, week.weekStart as LocalDate);
        }

        const clone = this.cloneWeek(week);

        const placeWindow = this.applyChange(clone, change);

        if (placeWindow) {
            this.placerService.place(clone, { window: placeWindow, allowBump: true });
        }

        const fullCtx: ValidateContext = { ...ctx, previousWeek: week };
        const validation = this.validatorService.validate(clone, fullCtx);
        const safeIssues = validation.issues ?? [];

        const violations = safeIssues.filter((i) => i.level === 'violation');
        const warnings = safeIssues.filter((i) => i.level === 'warning');
        const infos = safeIssues.filter((i) => i.level === 'info');

        if (violations.length > 0 || options?.dryRun) {
            return { ok: violations.length === 0, value: clone, violations, warnings, infos };
        }

        try {
            await this.persistWeek(clone, expectedVersion);
            clone.version = (expectedVersion ?? clone.version) + 1;
            clone.metadata = this.validatorService.summarize(clone);

            return { ok: true, value: clone, violations: [], warnings, infos };
        } catch (error: unknown) {

            if (
                error !== null &&
                typeof error === 'object' &&
                'code' in error &&
                error.code === 'P2025'
            ) {
                return this.versionConflictResult(week.id, week.consultantId, week.weekStart as LocalDate);
            }
            throw error;
        }
    }

    // -----------------------------------------------------------------
    // POST /scheduler/weeks/:weekStart/replan
    // -----------------------------------------------------------------

    public async replan(weekId: string, expectedVersion?: number): Promise<CommitResult> {
        const week = await this.getWeekById(weekId);

        const window: Interval = {
            start: this.timeService.localDateToInstant(week.weekStart, week.timezone),
            end: this.timeService.localDateToInstant(
                DateTime.fromISO(week.weekStart as string, { zone: 'utc' }).plus({ days: 7 }).toFormat('yyyy-MM-dd') as LocalDate,
                week.timezone,
            ),
        };

        const change: Change = { type: 'replan', window };
        const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };

        return this.commit(week, change, ctx, expectedVersion);
    }

    // -----------------------------------------------------------------
    // POST /scheduler/weeks/:weekStart/dry-run
    // -----------------------------------------------------------------

    public async dryRun(weekId: string, change: Change, expectedVersion?: number): Promise<CommitResult> {
        const week = await this.getWeekById(weekId);
        const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };
        return this.commit(week, change, ctx, expectedVersion, { dryRun: true });
    }



    private cloneWeek(week: WeekContainer): WeekContainer {
        return structuredClone(week);
    }


    private applyChange(week: WeekContainer, change: Change): Interval | undefined {
        switch (change.type) {
            case 'replan':
            case 'place_unplaced':
                break;

            case 'create_task':
                week.tasks.push(change.task as Task);
                break;

            case 'update_task':
                this.applyUpdateTask(week, change.taskId, change.patch);
                break;

            case 'delete_task':
                this.applyDeleteTask(week, change.taskId);
                break;

            case 'set_status':
                this.applySetStatus(week, change.taskId, change.status as Task['status']);
                break;

            case 'toggle_subtask':
                this.applyToggleSubtask(week, change.taskId, change.subtaskId);
                break;

            case 'split_task':
                this.applySplitTask(week, change.taskId, change.atMinutes);
                break;

            case 'accept_deadline_miss':
                this.applyAcceptDeadlineMiss(week, change.taskId);
                break;

            case 'move_slot':
                this.applyMoveSlot(week, change.slotId, change.to, change.tags);
                break;

            case 'move_block': {
                const block = this.getBlock(week, change.blockId);
                block.start = change.to.start;
                block.end = change.to.end;
                break;
            }
            case 'resize_block': {
                const block = this.getBlock(week, change.blockId);
                block.start = change.to.start;
                block.end = change.to.end;
                (block as ProjectBlock & { userSized?: boolean }).userSized = true;
                break;
            }
            case 'pin_block': {
                const block = this.getBlock(week, change.blockId);
                block.mobility = change.pinned ? 'pinned' : 'fluid';
                break;
            }
            default:
                throw new Error(`WeekService.applyChange: unhandled change type "${(change as Change).type}"`);
        }

        return change.window;
    }

    private applyUpdateTask(week: WeekContainer, taskId: string, patch: Partial<Task>): void {
        const idx = week.tasks.findIndex(t => t.id === taskId);
        if (idx > -1) week.tasks[idx] = { ...week.tasks[idx], ...patch } as Task;
    }

    private applyDeleteTask(week: WeekContainer, taskId: string): void {
        week.tasks = week.tasks.filter(t => t.id !== taskId);
        week.slots = week.slots.map(s => ({
            ...s,
            taskIds: s.taskIds.filter(id => id !== taskId)
        })).filter(s => s.taskIds.length > 0);
    }

    private applySetStatus(week: WeekContainer, taskId: string, status: Task['status']): void {
        const task = week.tasks.find(t => t.id === taskId);
        if (task) task.status = status;
    }

    private applyToggleSubtask(week: WeekContainer, taskId: string, subtaskId: string): void {
        const task = week.tasks.find(t => t.id === taskId);
        const sub = task?.subtasks?.find(s => s.id === subtaskId);
        if (sub) {
            sub.done = !sub.done;
        }

        if (task?.subtasks?.every(s => s.done)) {
            task.status = 'Done';
        }
    }

    private applySplitTask(week: WeekContainer, taskId: string, atMinutes: number): void {
        const orig = week.tasks.find(t => t.id === taskId);
        if (!orig) return;

        const originalTMax = orig.tMax;
        const originalTMin = orig.tMin;
        const splitRatio = atMinutes / originalTMax;

        orig.tMax = atMinutes;
        orig.tMin = Math.round(originalTMin * splitRatio);

        const secondHalf: Task = {
            ...orig,
            id: 'split-' + orig.id + '-' + Date.now(),
            tMax: originalTMax - atMinutes,
            tMin: Math.round(originalTMin * (1 - splitRatio)),
            status: 'Ready',
            placement: 'unplaced'
        };

        week.tasks.push(secondHalf);
    }

    private applyAcceptDeadlineMiss(week: WeekContainer, taskId: string): void {
        const task = week.tasks.find(t => t.id === taskId);
        if (task) {
            task.unplacedReason = undefined;
            task.deadlineMissAccepted = true;
        }
    }

    private applyMoveSlot(week: WeekContainer, slotId: string, to: Interval, tags?: string[]): void {
        const slot = week.slots.find((s) => s.id === slotId);
        if (!slot) {
            throw new NotFoundException('Task slot ' + slotId + ' not found in week ' + week.id);
        }

        slot.start = to.start;
        slot.end = to.end;
        slot.locked = true;
        if (tags) slot.tags = tags;
    }

    private getBlock(week: WeekContainer, blockId: string) {
        const block = week.blocks.find((b) => b.id === blockId);
        if (!block) {
            throw new NotFoundException('Project block ' + blockId + ' not found in week ' + week.id);
        }
        return block;
    }

    private async persistWeek(week: WeekContainer, expectedVersion?: number): Promise<void> {
        const whereClause = expectedVersion !== undefined
            ? { id: week.id, version: expectedVersion }
            : { id: week.id };

        await this.prisma.$transaction(async (tx) => {

            await tx.schedulerWeek.update({
                where: whereClause,
                data: { version: { increment: 1 }, lastCommittedAt: new Date() },
            });

            await tx.schedulerSlot.deleteMany({ where: { weekId: week.id } });
            if (week.slots.length > 0) {
                await tx.schedulerSlot.createMany({
                    data: week.slots.map((s) => ({
                        ...s,
                        weekId: week.id,
                        daySpan: s.daySpan ?? 1,
                        subtaskIds: s.subtaskIds ?? [],
                        tags: s.tags ?? [],
                    })),
                });
            }

            for (const t of week.tasks) {
                await tx.schedulerTask.update({
                    where: { id: t.id },
                    data: { placement: t.placement, unplacedReason: t.unplacedReason, status: t.status },
                });
            }

            for (const b of week.blocks) {
                if ((b as unknown as { manuallyResized?: boolean }).manuallyResized) {
                    await tx.schedulerProjectBlock.update({
                        where: { id: b.id },
                        data: { allocatedMinutes: b.allocatedMinutes, mobility: b.mobility, start: b.start, end: b.end },
                    });
                }
            }
        });
    }

    private async getWeekById(weekId: string): Promise<WeekContainer> {
        const dbWeek = await this.prisma.schedulerWeek.findUnique({ where: { id: weekId } });
        if (!dbWeek) throw new NotFoundException(`Week ${weekId} not found`);
        const weekStartStr = DateTime.fromJSDate(dbWeek.weekStart, { zone: 'utc' }).toFormat('yyyy-MM-dd') as LocalDate;

        return this.getWeek(dbWeek.consultantId, weekStartStr);
    }

    private async versionConflictResult(weekId: string, consultantId: string, weekStart: LocalDate): Promise<CommitResult> {
        const current = await this.getWeek(consultantId, weekStart);
        return {
            ok: false,
            value: current,
            violations: [{
                level: 'violation',
                code: 'VERSION_CONFLICT',
                message: 'The week was modified by another request. Please refresh and try again.',
            }],
            warnings: [],
            infos: [],
        };
    }
}