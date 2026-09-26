import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService, CommitResult } from './week.service';
import { PlacerService } from './placer.service';
import { TimeService, LocalDate, Instant } from './time.service';
import { SCHEDULER_RULES } from './scheduler-rules.constant';
import { WeekContainer, Change, ReasonCode, Interval, Task, ValidateContext } from '../dto/scheduler.dto';

export interface Suggestion {
    code: string;
    message: string;
    action?: any;
}

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
        const suggestions: Suggestion[] = [];

        const available = week.metadata.available ?? 0;
        const scheduled = week.metadata.scheduled ?? 0;

        const bufferTargetMinutes = (SCHEDULER_RULES as any).BUFFER_TARGET_MIN_MINUTES
            ?? Math.round(SCHEDULER_RULES.CONTRACT_SOFT_CAP_MINUTES * SCHEDULER_RULES.BUFFER_TARGET_PERCENTAGE);

        const gap = available - scheduled - bufferTargetMinutes;

        if (gap <= 0) {
            return suggestions;
        }

        const dismissals = await this.prisma.schedulerIssueDismissal.findMany({
            where: { weekId: week.id },
        });
        const dismissedCodes = new Set(dismissals.map((d) => d.code));

        if (!dismissedCodes.has('PLACE_UNPLACED')) {
            const unplacedTasks = week.tasks.filter((t) => t.placement === 'unplaced');
            if (unplacedTasks.length > 0) {
                const dryRunRes = await this.weekService.dryRun(week.id, {
                    type: 'replan',
                    window: this.getWeekWindow(week),
                });

                if (dryRunRes.ok) {
                    suggestions.push({
                        code: 'PLACE_UNPLACED',
                        message: `You have ${unplacedTasks.length} unplaced task(s) and available capacity.`,
                        action: { type: 'replan' },
                    });
                }
            }
        }

        if (!dismissedCodes.has('PULL_FORWARD')) {
            const pullForwardSuggestion = await this.buildPullForwardCandidate(week, gap);
            if (pullForwardSuggestion) suggestions.push(pullForwardSuggestion);
        }

        if (!dismissedCodes.has('EXTEND_BLOCK')) {
            const extendSuggestion = await this.buildExtendBlockCandidate(week, gap);
            if (extendSuggestion) suggestions.push(extendSuggestion);
        }

        if (suggestions.length === 0 && !dismissedCodes.has('REVIEW_CAPACITY')) {
            const hours = Math.floor(gap / 60);
            const minutes = gap % 60;
            suggestions.push({
                code: 'REVIEW_CAPACITY',
                message: `You have ${hours}h${minutes}m of unused capacity this week.`,
            });
        }

        return suggestions;
    }

    // -----------------------------------------------------------------
    // POST /scheduler/weeks/:weekStart/pull-forward
    // -----------------------------------------------------------------

    public async pullForward(
        weekId: string,
        taskIds: string[],
        expectedVersion?: number,
    ): Promise<CommitResult> {
        const dbWeek = await this.prisma.schedulerWeek.findUnique({ where: { id: weekId } });

        if (!dbWeek) {
            throw new NotFoundException(`Week ${weekId} not found`);
        }

        const formattedDate = dbWeek.weekStart.toISOString().split('T')[0] as LocalDate;
        const week = await this.weekService.getWeek(dbWeek.consultantId, formattedDate);

        const tasks = await this.prisma.schedulerTask.findMany({ where: { id: { in: taskIds } } });

        if (tasks.length !== taskIds.length) {
            const found = new Set(tasks.map((t) => t.id));
            const missing = taskIds.filter((id) => !found.has(id));
            throw new NotFoundException(`Task(s) not found: ${missing.join(', ')}`);
        }

        const change: Change = {
            type: 'pull_forward',
            taskIds,
            tasks: tasks as unknown as Task[],
            origin: 'user',
            window: this.getWeekWindow(week),
        } as Change;

        const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };

        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    // -----------------------------------------------------------------
    // POST /scheduler/weeks/:weekStart/issues/:code/dismiss
    // -----------------------------------------------------------------

    public async dismiss(weekId: string, code: string): Promise<void> {
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
            where: { consultantId_weekStart: { consultantId: week.consultantId, weekStart: nextWeekStart } },
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

        if (!dryRunRes.ok) return null;

        return {
            code: 'PULL_FORWARD',
            message: `You have capacity to pull forward ${candidateIds.length} task(s) from next week.`,
            action: { type: 'pull_forward', taskIds: candidateIds },
        };
    }

    private async buildExtendBlockCandidate(week: WeekContainer, gap: number): Promise<Suggestion | null> {
        const weekEnd = this.getWeekWindow(week).end;

        for (const block of week.blocks) {
            if (block.mobility !== 'fluid') continue;
            if (block.end >= weekEnd) continue;

            const hasWaitingTasks = week.tasks.some(
                (t) => t.projectId === block.projectId && (t.placement === 'unplaced' || t.status === 'Ready'),
            );
            if (!hasWaitingTasks) continue;

            const extendedEnd = this.clampInstant(
                this.addMinutes(block.end, Math.min(gap, this.minutesBetween(block.end, weekEnd))),
                weekEnd,
            );
            if (extendedEnd === block.end) continue;

            const dryRunRes = await this.weekService.dryRun(week.id, {
                type: 'resize_block',
                blockId: block.id,
                to: { start: block.start, end: extendedEnd },
                origin: 'system',
                window: this.getWeekWindow(week),
            } as Change);

            if (dryRunRes.ok) {
                return {
                    code: 'EXTEND_BLOCK',
                    message: `Extending ${block.projectId}'s block could fit more of its waiting work in this week.`,
                    action: { type: 'resize_block', blockId: block.id, to: { start: block.start, end: extendedEnd } },
                };
            }
        }

        return null;
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

    private minutesBetween(start: string, end: string): number {
        return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    }

    private addMinutes(instant: string, minutes: number): string {
        return new Date(new Date(instant).getTime() + minutes * 60000).toISOString().replace(/\.\d{3}Z$/, 'Z');
    }

    private clampInstant(instant: string, max: string): string {
        return new Date(instant).getTime() > new Date(max).getTime() ? max : instant;
    }
}