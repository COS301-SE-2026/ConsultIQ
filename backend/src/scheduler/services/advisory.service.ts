import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService, CommitResult } from './week.service';
import { PlacerService } from './placer.service';
import { TimeService, LocalDate, Instant } from './time.service';
import { SCHEDULER_RULES } from './scheduler-rules.constant';
import { WeekContainer, Change, Interval, Task, ValidateContext } from '../dto/scheduler.dto';

export interface Suggestion {
    code: string;
    message: string;
    action?: any;
}

// Issue codes that describe a real problem and must stay visible
const PERSISTENT_CODES = new Set(['CONTAINERS_EXCEED_CONTRACT']);

@Injectable()
export class AdvisoryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly weekService: WeekService,
        private readonly placerService: PlacerService,
        private readonly timeService: TimeService,
    ) { }

    // -----------------------------------------------------------------
    // Daily tick: build capacity suggestions
    // -----------------------------------------------------------------

    public async buildSuggestions(week: WeekContainer): Promise<Suggestion[]> {
        const gap = this.spareMinutes(week);
        if (gap <= 0) return [];

        const dismissedCodes = await this.dismissedCodes(week.id);
        if (dismissedCodes.has('UNDERUTILISED')) return [];

        // Checked in this order; each one returns a suggestion or null
        const candidates: Array<[string, () => Promise<Suggestion | null>]> = [
            ['PLACE_UNPLACED', () => this.buildPlaceUnplacedCandidate(week)],
            ['PULL_FORWARD', () => this.buildPullForwardCandidate(week, gap)],
            ['EXTEND_BLOCK', () => this.buildExtendBlockCandidate(week, gap)],
        ];

        const results = await Promise.all(
            candidates
                .filter(([code]) => !dismissedCodes.has(code))
                .map(([, build]) => build()),
        );
        const suggestions = results.filter((s): s is Suggestion => s !== null);

        // Fallback when there is nothing more specific to suggest
        if (suggestions.length === 0 && !dismissedCodes.has('REVIEW_CAPACITY')) {
            suggestions.push(this.reviewCapacitySuggestion(gap));
        }

        return suggestions;
    }

    // Unused working time left after scheduled work and the buffer
    private spareMinutes(week: WeekContainer): number {
        const available = week.metadata.available ?? 0;
        const scheduled = week.metadata.scheduled ?? 0;
        const bufferTargetMinutes = (SCHEDULER_RULES as any).BUFFER_TARGET_MIN_MINUTES
            ?? Math.round(SCHEDULER_RULES.CONTRACT_SOFT_CAP_MINUTES * SCHEDULER_RULES.BUFFER_TARGET_PERCENTAGE);

        return available - scheduled - bufferTargetMinutes;
    }

    private async dismissedCodes(weekId: string): Promise<Set<string>> {
        const dismissals = await this.prisma.schedulerIssueDismissal.findMany({ where: { weekId } });
        return new Set(dismissals.map((d) => d.code));
    }

    private async buildPlaceUnplacedCandidate(week: WeekContainer): Promise<Suggestion | null> {
        const unplacedTasks = week.tasks.filter((t) => t.placement === 'unplaced');
        if (unplacedTasks.length === 0) return null;

        const dryRunRes = await this.weekService.dryRun(week.id, {
            type: 'replan',
            window: this.getWeekWindow(week),
        });

        // Only suggest it when a replan would actually place at least one of them
        if (!dryRunRes.ok || this.unplacedCount(dryRunRes.value) >= unplacedTasks.length) return null;

        return {
            code: 'PLACE_UNPLACED',
            message: `You have ${unplacedTasks.length} unplaced task(s) and available capacity.`,
            action: { type: 'place_unplaced', taskIds: unplacedTasks.map((t) => t.id) },
        };
    }

    private reviewCapacitySuggestion(gap: number): Suggestion {
        const hours = Math.floor(gap / 60);
        const minutes = gap % 60;
        return {
            code: 'REVIEW_CAPACITY',
            message: `You have ${hours}h${minutes}m of unused capacity this week.`,
        };
    }

    // -----------------------------------------------------------------
    // POST /scheduler/weeks/:weekStart/pull-forward
    // -----------------------------------------------------------------

    public async pullForward(
        weekId: string,
        taskIds: string[],
        expectedVersion?: number,
    ): Promise<CommitResult> {
        if (!taskIds.length) {
            throw new BadRequestException('No task IDs provided to pull forward.');
        }

        const dbWeek = await this.prisma.schedulerWeek.findUnique({ where: { id: weekId } });

        if (!dbWeek) {
            throw new NotFoundException(`Week ${weekId} not found`);
        }

        const formattedDate = dbWeek.weekStart.toISOString().split('T')[0] as LocalDate;
        const week = await this.weekService.getWeek(dbWeek.consultantId, formattedDate);

        const tasks = await this.prisma.schedulerTask.findMany({
            where: { id: { in: taskIds } },
            include: { week: true, subtasks: true }
        });

        if (tasks.length !== taskIds.length) {
            const found = new Set(tasks.map((t) => t.id));
            const missing = taskIds.filter((id) => !found.has(id));
            throw new NotFoundException(`Task(s) not found: ${missing.join(', ')}`);
        }

        const currentWeekStart = dbWeek.weekStart.getTime();

        for (const task of tasks) {
            if (task.week.consultantId !== dbWeek.consultantId) {
                throw new ForbiddenException(`You do not have permission to pull forward task ${task.id}`);
            }
            if (task.week.weekStart.getTime() <= currentWeekStart) {
                throw new BadRequestException(`Task ${task.id} is not in a future week.`);
            }
            if (task.status !== 'Ready') {
                throw new BadRequestException(`Task ${task.id} has already been started and can't be moved.`);
            }
        }

        // Re-home each task: this week's id, no old placement details, no Prisma relation object
        const mappedTasks = tasks.map((task) => {
            const t: Record<string, unknown> = { ...task };
            delete t.week;
            return {
                ...t,
                weekId: week.id,
                placement: 'unplaced',
                unplacedReason: undefined,
                unplacedNeededMinutes: undefined,
                unplacedAvailableMinutes: undefined,
            };
        }) as unknown as Task[];

        const change: Change = {
            type: 'pull_forward',
            taskIds,
            tasks: mappedTasks,
            origin: 'user',
            window: this.getWeekWindow(week),
        } as Change;

        const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };

        const result = await this.weekService.commit(week, change, ctx, expectedVersion);

        // The tasks now belong to this week: remove their old slots and mark the old weeks as changed
        if (result.ok) {
            const sourceWeekIds = [...new Set(tasks.map((t) => t.weekId))];
            await this.prisma.$transaction([
                // Unlink the moved tasks from slots in their old weeks
                this.prisma.schedulerSlotTask.deleteMany({
                    where: { taskId: { in: taskIds }, slot: { weekId: { in: sourceWeekIds } } },
                }),
                // Slots left with no tasks at all are deleted
                this.prisma.schedulerSlot.deleteMany({
                    where: { weekId: { in: sourceWeekIds }, slotTasks: { none: {} } },
                }),
                // Anyone with an old week open gets a version conflict and refreshes
                this.prisma.schedulerWeek.updateMany({
                    where: { id: { in: sourceWeekIds } },
                    data: { version: { increment: 1 } },
                }),
            ]);
        }
        return result;
    }

    // -----------------------------------------------------------------
    // POST /scheduler/weeks/:weekStart/issues/:code/dismiss
    // -----------------------------------------------------------------

    public async dismiss(weekId: string, code: string): Promise<void> {
        if (PERSISTENT_CODES.has(code)) {
            throw new BadRequestException(`${code} cannot be dismissed`);
        }

        await this.prisma.schedulerIssueDismissal.upsert({
            where: { weekId_code: { weekId, code } },
            update: { dismissedAt: new Date() },
            create: { weekId, code, dismissedAt: new Date() },
        });
    }

    private async buildPullForwardCandidate(week: WeekContainer, gap: number): Promise<Suggestion | null> {
        const nextWeekStart = DateTime.fromISO(week.weekStart as string, { zone: 'utc' })
            .plus({ days: 7 }).toFormat('yyyy-MM-dd') as LocalDate;

        const nextWeekDb = await this.prisma.schedulerWeek.findUnique({
            where: { consultantId_weekStart: { consultantId: week.consultantId, weekStart: new Date(`${nextWeekStart}T00:00:00Z`) } },
            include: { tasks: true },
        });

        if (!nextWeekDb) return null;

        const now = new Date().toISOString();
        const readyTasks = (nextWeekDb.tasks as unknown as Task[])
            .filter((t) => t.status === 'Ready')
            .sort((a, b) => this.placerService.priorityScore(b, now as Instant) - this.placerService.priorityScore(a, now as Instant));

        const candidateIds: string[] = [];
        let used = 0;
        for (const t of readyTasks) {
            if (used + t.tMax > gap) continue;
            candidateIds.push(t.id);
            used += t.tMax;
        }

        if (candidateIds.length === 0) return null;

        const dryRunRes = await this.weekService.dryRun(week.id, {
            type: 'pull_forward',
            taskIds: candidateIds,
            tasks: readyTasks.filter((t) => candidateIds.includes(t.id)),
            origin: 'system',
            window: this.getWeekWindow(week),
        } as Change);

        // Every pulled task must actually get time this week
        const allPlaced = candidateIds.every(
            (id) => dryRunRes.value.tasks.find((t) => t.id === id)?.placement === 'placed',
        );
        if (!dryRunRes.ok || !allPlaced) return null;

        return {
            code: 'PULL_FORWARD',
            message: `You have capacity to pull forward ${candidateIds.length} task(s) from next week.`,
            action: { type: 'pull_forward', taskIds: candidateIds },
        };
    }

    private async buildExtendBlockCandidate(week: WeekContainer, gap: number): Promise<Suggestion | null> {
        for (const block of week.blocks) {
            if (block.mobility !== 'fluid') continue;

            // Only worth extending when this project has work that couldn't be placed
            const hasUnplaced = week.tasks.some((t) => t.projectId === block.projectId && t.placement === 'unplaced');
            if (!hasUnplaced) continue;

            // Room to grow: up to the end of that working day, and never into a later block
            const blockEndMs = Date.parse(block.end);
            const dayEndMs = this.workingDayEndMs(week, block.end);
            const nextBlockStartMs = week.blocks
                .filter((b) => b.id !== block.id && Date.parse(b.start) >= blockEndMs)
                .reduce((min, b) => Math.min(min, Date.parse(b.start)), Infinity);

            const limitMs = Math.min(dayEndMs, nextBlockStartMs, blockEndMs + gap * 60_000);
            if (!Number.isFinite(limitMs) || limitMs <= blockEndMs) continue;

            const extendedEnd = new Date(limitMs).toISOString().replace(/\.\d{3}Z$/, 'Z');

            const dryRunRes = await this.weekService.dryRun(week.id, {
                type: 'resize_block',
                blockId: block.id,
                to: { start: block.start, end: extendedEnd },
                origin: 'system',
                window: this.getWeekWindow(week),
            } as Change);

            if (dryRunRes.ok && this.unplacedCount(dryRunRes.value) < this.unplacedCount(week)) {
                const projectName = await this.projectName(block.projectId);
                const day = DateTime.fromISO(block.start, { zone: week.timezone }).toFormat('cccc');
                return {
                    code: 'EXTEND_BLOCK',
                    message: `Extending ${projectName}'s block on ${day} could fit more of its waiting work in this week.`,
                    action: { type: 'resize_block', blockId: block.id, to: { start: block.start, end: extendedEnd } },
                };
            }
        }

        return null;
    }

    // End of the working day (core hours) that contains this instant; -Infinity if it isn't a working day
    private workingDayEndMs(week: WeekContainer, instant: string): number {
        const day = this.timeService.localDate(instant, week.timezone);
        const ends = this.timeService.workingWindows(week.weekStart, week.timezone)
            .filter((w) => this.timeService.localDate(w.start, week.timezone) === day)
            .map((w) => Date.parse(w.end));
        return ends.length > 0 ? Math.max(...ends) : -Infinity;
    }

    // A readable project name for messages, falling back to a generic word
    private async projectName(projectId: string): Promise<string> {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { projectName: true },
        });
        return project?.projectName ?? 'this project';
    }

    private getWeekWindow(week: WeekContainer): Interval {
        const start = this.timeService.localDateToInstant(week.weekStart, week.timezone);
        const nextMonday = DateTime.fromISO(week.weekStart as string, { zone: 'utc' })
            .plus({ days: 7 })
            .toFormat('yyyy-MM-dd') as LocalDate;

        return {
            start,
            end: this.timeService.localDateToInstant(nextMonday, week.timezone),
        };
    }

    private unplacedCount(week: WeekContainer): number {
        return week.tasks.filter((t) => t.placement === 'unplaced').length;
    }
}