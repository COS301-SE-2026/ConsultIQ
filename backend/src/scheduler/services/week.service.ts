import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeService, type LocalDate } from './time.service';
import { HolidayService } from './holiday.service';
import { PlacerService } from './placer.service';
import { ValidatorService } from './validator.service';
import { randomUUID } from 'node:crypto';
import { SCHEDULER_RULES } from './scheduler-rules.constant';

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
    CalendarEntry,
    PrismaSlotWithTasks,
    PrismaBlock,
    CalendarEntryDto,
    PublicHoliday,
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
    // GET /scheduler/weeks/:weekStart (With Auto-Initialization)
    // -----------------------------------------------------------------

    public async getWeek(consultantId: string, weekStart: LocalDate): Promise<WeekContainer> {
        const weekIncludes = {
            blocks: true,
            tasks: { include: { subtasks: true } },
            calendarEntries: true,
            slots: { include: { slotTasks: true } }
        };

        const existingWeek = await this.prisma.schedulerWeek.findUnique({
            where: {
                consultantId_weekStart: {
                    consultantId,
                    weekStart: new Date(`${weekStart}T00:00:00Z`),
                },
            },
            include: weekIncludes,
        });

        const timezone = process.env.SCHEDULER_DEFAULT_TIMEZONE ?? 'UTC';

        const dbWeek = existingWeek ?? await this.prisma.schedulerWeek.create({
            data: {
                consultantId,
                weekStart: new Date(`${weekStart}T00:00:00Z`),
                timezone,
                version: 1,
                sourceOfLastChange: 'system',
                lastCommittedAt: new Date(),
            },
            include: weekIncludes,
        });

        const holidays = (await this.holidayService.getForWeek(weekStart)) || [];

        let dbBlocks = dbWeek.blocks;

        if (dbBlocks.length === 0) {
            await this.seedPlacementBlocks(dbWeek.id, consultantId, weekStart, dbWeek.timezone, holidays);
            dbBlocks = await this.prisma.schedulerProjectBlock.findMany({
                where: { weekId: dbWeek.id },
            }) as any;
        }

        const blocks = this.resolveBlocks({ blocks: dbBlocks as PrismaBlock[] });

        const slots = dbWeek.slots.map((s: PrismaSlotWithTasks) => ({
            ...s,
            taskIds: s.slotTasks ? s.slotTasks.map((st) => st.taskId) : [],
        })) as unknown as Slot[];

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
            slots,
            metadata: {} as WeekContainer['metadata'],
        };

        week.metadata = this.validatorService.summarize(week);
        return week;
    }

    private resolveBlocks(dbWeek: {
        blocks: PrismaBlock[];
    }): ProjectBlock[] {
        return dbWeek.blocks.map((b) => {
            if (b.userSized || b.allocation == null) {
                return b as unknown as ProjectBlock;
            }
            return {
                ...b,
                allocatedMinutes: this.placerService.blockMinutes(b.allocation as AllocationSummary),
            } as unknown as ProjectBlock;
        });
    }

    // -----------------------------------------------------------------
    // BLOCK SEEDING 
    // -----------------------------------------------------------------

    private async seedPlacementBlocks(
        weekId: string,
        consultantId: string,
        weekStart: LocalDate,
        timezone: string,
        holidays: PublicHoliday[],
    ): Promise<void> {
        const weekStartDate = DateTime.fromISO(weekStart as string, { zone: "utc" }).startOf("day");
        const weekEndDate = weekStartDate.plus({ days: 7 });

        const placements = await this.prisma.projectPlacement.findMany({
            where: {
                consultantId,
                status: "ACTIVE",
                startDate: { lt: weekEndDate.toJSDate() },
                OR: [
                    { endDate: null },
                    { endDate: { gte: weekStartDate.toJSDate() } },
                ],
            },
            select: {
                id: true,
                projectId: true,
                allocation: true,
                startDate: true,
                endDate: true,
            },
            orderBy: [{ startDate: "asc" }, { id: "asc" }],
        });

        if (placements.length === 0) return;

        const holidayDates = new Set(holidays.map((holiday) => holiday.date));
        const windowsByDay = new Map();

        for (const window of this.timeService.workingWindows(weekStart, timezone)) {
            const day = this.timeService.localDate(window.start, timezone);
            if (holidayDates.has(day)) continue;

            const windows = windowsByDay.get(day) ?? [];
            windows.push(window);
            windowsByDay.set(day, windows);
        }

        const data: Array<{
            id: string;
            weekId: string;
            projectId: string;
            placementId: string;
            allocatedMinutes: number;
            start: Date;
            end: Date;
            mobility: "fluid";
            userSized: boolean;
        }> = [];

        for (const [day, windows] of windowsByDay) {
            const activePlacements = placements.filter((placement) => {
                const start = DateTime.fromJSDate(placement.startDate, { zone: "utc" }).toFormat("yyyy-MM-dd");
                const end = placement.endDate
                    ? DateTime.fromJSDate(placement.endDate, { zone: "utc" }).toFormat("yyyy-MM-dd")
                    : null;

                return start <= day && (!end || end >= day);
            });

            const totalAllocation = activePlacements.reduce(
                (sum: number, placement): number => sum + placement.allocation,
                0,
            );

            const allocationDivisor = Math.max(totalAllocation, 100);

            const availableWindowMinutes = windows.reduce(
                (sum: number, window: Interval): number => sum + this.durationMinutes(window.start, window.end),
                0,
            );

            let cursorMinutes = 0;

            for (const placement of activePlacements) {
                const blockMinutes = Math.floor(
                    availableWindowMinutes * placement.allocation / allocationDivisor,
                );
                if (blockMinutes <= 0) continue;

                const start = this.workingWindowInstantAt(windows, cursorMinutes);
                const end = this.workingWindowInstantAt(windows, cursorMinutes + blockMinutes);
                cursorMinutes += blockMinutes;

                data.push({
                    id: randomUUID(),
                    weekId,
                    projectId: placement.projectId,
                    placementId: placement.id,
                    allocatedMinutes: Math.round(
                        (SCHEDULER_RULES.CONTRACT_SOFT_CAP_MINUTES * placement.allocation / 100) / 5,
                    ),
                    start: new Date(start),
                    end: new Date(end),
                    mobility: "fluid",
                    userSized: false,
                });
            }
        }

        if (data.length > 0) {
            await this.prisma.schedulerProjectBlock.createMany({
                data,
                skipDuplicates: true,
            });
        }
    }

    private workingWindowInstantAt(windows: Interval[], offsetMinutes: number): string {
        for (let index = 0; index < windows.length; index++) {
            const window = windows[index];
            const duration = this.durationMinutes(window.start, window.end);

            if (offsetMinutes < duration) {
                return new Date(Date.parse(window.start) + offsetMinutes * 60_000).toISOString();
            }

            offsetMinutes -= duration;

            if (offsetMinutes === 0) {
                return windows[index + 1]?.start ?? window.end;
            }
        }

        return windows.at(-1)?.end ?? "";
    }

    private durationMinutes(start: string, end: string): number {
        return (Date.parse(end) - Date.parse(start)) / 60_000;
    }

    // -----------------------------------------------------------------
    // MUTATION PIPELINE & APPLY CHANGE
    // -----------------------------------------------------------------

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

        if (change.type === 'place_unplaced') {
            for (const t of clone.tasks) {
                if ((t as any)._tempBlinded) {
                    t.placement = 'unplaced';
                    delete (t as any)._tempBlinded;
                }
            }
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
                break;
            case 'place_unplaced':
                this.applyPlaceUnplacedChange(week, change.taskIds);
                break;
            case 'create_task':
                if (!change.task.id) change.task.id = randomUUID();
                if (change.task.subtasks) {
                    change.task.subtasks.forEach((st: any) => {
                        if (!st.id) st.id = randomUUID();
                    });
                }
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
            case 'move_block':
                this.applyMoveBlock(week, change.blockId, change.to);
                break;
            case 'resize_block':
                this.applyResizeBlock(week, change.blockId, change.to);
                break;
            case 'pin_block':
                this.applyPinBlock(week, change.blockId, change.pinned);
                break;
            case 'calendar_upsert':
                this.applyCalendarUpsert(week, change.entry);
                break;
            case 'calendar_remove':
                week.calendarEntries = week.calendarEntries.filter(e => e.id !== change.entryId);
                break;
            case 'pull_forward':
                if (change.tasks) {
                    change.tasks.forEach(t => {
                        if (!t.id) t.id = randomUUID();
                        if (t.subtasks) {
                            t.subtasks.forEach((st: any) => {
                                if (!st.id) st.id = randomUUID();
                            });
                        }
                    });
                    week.tasks.push(...change.tasks);
                }
                break;
            case 'rollover':
                this.applyRollover(week, change.taskId, change.fromSlotId);
                break;
            case 'mark_incomplete':
                this.applyMarkIncomplete(week, change.taskId);
                break;
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
        if (sub) sub.done = !sub.done;
        if (task?.subtasks?.every(s => s.done)) task.status = 'Done';
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
        if (!slot) throw new NotFoundException('Task slot ' + slotId + ' not found');
        slot.start = to.start;
        slot.end = to.end;
        slot.locked = true;
        if (tags) slot.tags = tags;
    }

    private applyPlaceUnplacedChange(week: WeekContainer, taskIds: string[]): void {
        for (const t of week.tasks) {
            if (t.placement === 'unplaced' && !taskIds.includes(t.id)) {
                t.placement = 'placed';
                (t as Task & { _tempBlinded?: boolean })._tempBlinded = true;
            }
        }
    }

    private applyMoveBlock(week: WeekContainer, blockId: string, to: Interval): void {
        const block = this.getBlock(week, blockId);
        block.start = to.start;
        block.end = to.end;
    }

    private applyResizeBlock(week: WeekContainer, blockId: string, to: Interval): void {
        const block = this.getBlock(week, blockId);
        block.start = to.start;
        block.end = to.end;
        (block as ProjectBlock & { userSized?: boolean }).userSized = true;
    }

    private applyPinBlock(week: WeekContainer, blockId: string, pinned: boolean): void {
        const block = this.getBlock(week, blockId);
        block.mobility = pinned ? 'pinned' : 'fluid';
    }

    private applyCalendarUpsert(week: WeekContainer, dto: CalendarEntryDto): void {
        const existingIdx = week.calendarEntries.findIndex(e => e.id === dto.id);
        if (existingIdx > -1) {
            week.calendarEntries[existingIdx] = { ...week.calendarEntries[existingIdx], ...dto } as CalendarEntry;
        } else {
            week.calendarEntries.push(dto as CalendarEntry);
        }
    }

    private applyRollover(week: WeekContainer, taskId: string, fromSlotId: string): void {
        const rTask = week.tasks.find(t => t.id === taskId);
        const rSlot = week.slots.find(s => s.id === fromSlotId);
        if (rTask) {
            rTask.placement = 'unplaced';
            rTask.carriedOver = true;
        }
        if (rSlot) {
            rSlot.taskIds = rSlot.taskIds.filter(id => id !== taskId);
        }
    }

    private applyMarkIncomplete(week: WeekContainer, taskId: string): void {
        const taskToRevert = week.tasks.find(t => t.id === taskId);
        if (taskToRevert) {
            taskToRevert.status = taskToRevert.status === 'Done' ? 'InProgress' : 'Ready';
            if (taskToRevert.subtasks && taskToRevert.subtasks.length > 0) {
                const lastDone = [...taskToRevert.subtasks].reverse().find(s => s.done);
                if (lastDone) {
                    lastDone.done = false;
                }
            }
        }
    }

    private getBlock(week: WeekContainer, blockId: string) {
        const block = week.blocks.find((b) => b.id === blockId);
        if (!block) throw new NotFoundException('Project block ' + blockId + ' not found');
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

            await this.persistCalendarEntries(tx, week);
            await this.persistTasksAndSubtasks(tx, week);
            await this.persistSlots(tx, week);
        });
    }

    private async persistCalendarEntries(tx: any, week: WeekContainer): Promise<void> {
        await tx.schedulerCalendarEntry.deleteMany({ where: { weekId: week.id } });
        if (!week.calendarEntries || week.calendarEntries.length === 0) return;

        await tx.schedulerCalendarEntry.createMany({
            data: week.calendarEntries.map(e => {
                const dbType = (e.type === 'ad-hoc' ? 'ad_hoc' : e.type) as unknown as
                    'meeting' | 'training' | 'travel' | 'personal' | 'leave' | 'ad_hoc';
                const dbOrigin = (
                    e.origin === 'public-holiday' ? 'public_holiday' : e.origin
                ) as unknown as 'user' | 'feed' | 'system' | 'public_holiday';

                return {
                    id: e.id,
                    weekId: week.id,
                    type: dbType,
                    start: new Date(e.start),
                    end: new Date(e.end),
                    origin: dbOrigin,
                    tags: e.tags ?? [],
                };
            })
        });
    }

    private async persistTasksAndSubtasks(tx: any, week: WeekContainer): Promise<void> {
        const memoryTaskIds = week.tasks.map(t => t.id).filter(id => id != null);

        await tx.schedulerTask.deleteMany({
            where: {
                weekId: week.id,
                id: { notIn: memoryTaskIds }
            }
        });

        await Promise.all(week.tasks.map(async (t) => {
            if (!t.id) {
                t.id = randomUUID();
            }
            const taskId = t.id;

            const taskData = {
                weekId: week.id,
                projectId: t.projectId,
                title: t.title,
                tMin: t.tMin,
                tMax: t.tMax,
                urgency: t.urgency,
                complexity: t.complexity,
                status: t.status,
                placement: t.placement,
                unplacedReason: t.unplacedReason,
                carriedOver: t.carriedOver ?? false,
                deadlineMissAccepted: t.deadlineMissAccepted ?? false,
                deadline: t.deadline ? new Date(t.deadline) : null,
                dependsOn: t.dependsOn ?? [],
            };

            await tx.schedulerTask.upsert({
                where: { id: taskId },
                update: taskData,
                create: { id: taskId, ...taskData }
            });

            await tx.schedulerSubtask.deleteMany({ where: { taskId: taskId } });
            
            if (t.subtasks && t.subtasks.length > 0) {
                await tx.schedulerSubtask.createMany({
                    data: t.subtasks.map((sub: any) => {
                        if (!sub.id) sub.id = randomUUID();
                        return {
                            id: sub.id,
                            taskId: taskId,
                            title: sub.title ?? 'Subtask',
                            done: sub.done ?? false,
                            estimate: sub.estimate ?? 0
                        };
                    })
                });
            }
        }));

        await Promise.all(
            week.blocks
                .filter(b => b.userSized)
                .map(async (b) => {
                    await tx.schedulerProjectBlock.update({
                        where: { id: b.id },
                        data: { allocatedMinutes: b.allocatedMinutes, mobility: b.mobility, start: b.start, end: b.end },
                    });
                })
        );
    }

    private async persistSlots(tx: any, week: WeekContainer): Promise<void> {
        await tx.schedulerSlotTask.deleteMany({ where: { slot: { weekId: week.id } } });
        await tx.schedulerSlot.deleteMany({ where: { weekId: week.id } });

        await Promise.all(week.slots.map(async (s): Promise<void> => {
            await tx.schedulerSlot.create({
                data: {
                    id: s.id,
                    weekId: week.id,
                    kind: s.kind,
                    blockId: s.blockId,
                    start: s.start,
                    end: s.end,
                    locked: s.locked,
                    daySpan: s.daySpan ?? 1,
                }
            });

            if (s.taskIds && s.taskIds.length > 0) {
                await tx.schedulerSlotTask.createMany({
                    data: s.taskIds.map(taskId => ({
                        slotId: s.id,
                        taskId: taskId
                    }))
                });
            }
        }));
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