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
                return change.window;

            case 'create_task':
                // TODO(TaskService): push the new task onto week.tasks, return a window covering
                // it if it should be placed immediately.
                return undefined;

            case 'move_slot': {
                const slot = week.slots.find((s) => s.id === change.slotId);
                if (!slot) throw new NotFoundException(`Task slot \({change.slotId} not found in week\){week.id}`);

                slot.start = change.to.start;
                slot.end = change.to.end;

                slot.locked = true;
                if (change.tags) slot.tags = change.tags;

                return change.window;
            }

            case 'move_block': {
                const block = week.blocks.find((b) => b.id === change.blockId);
                if (!block) throw new NotFoundException(`Project block \({change.blockId} not found in week\){week.id}`);

                block.start = change.to.start;
                block.end = change.to.end;

                return change.window;
            }

            case 'resize_block': {
                const block = week.blocks.find((b) => b.id === change.blockId);
                if (!block) throw new NotFoundException(`Project block \({change.blockId} not found in week\){week.id}`);

                block.start = change.to.start;
                block.end = change.to.end;

                (block as ProjectBlock & { userSized?: boolean }).userSized = true;

                return change.window;
            }

            case 'pin_block': {
                const block = week.blocks.find((b) => b.id === change.blockId);
                if (!block) throw new NotFoundException(`Project block \({change.blockId} not found in week\){week.id}`);

                block.mobility = change.pinned ? 'pinned' : 'fluid';

                return change.window;
            }
            default:

                throw new Error(`WeekService.applyChange: unhandled change type "${(change as Change).type}"`);
        }
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