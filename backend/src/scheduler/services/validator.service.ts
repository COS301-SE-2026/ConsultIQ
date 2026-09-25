import { Injectable, Logger } from '@nestjs/common';
import {
    WeekContainer,
    ValidateContext,
    Issue,
    WeekMetadata,
    Slot,
    Result,
    Task,
} from '../dto/scheduler.dto';
import { SCHEDULER_RULES } from './scheduler-rules.constant';
import { TimeService } from './time.service';

@Injectable()
export class ValidatorService {
    private readonly logger = new Logger(ValidatorService.name);

    constructor(private readonly timeService: TimeService) { }

    /**
     * Tier 2: The Orchestrator
     * Runs the ordered validator list (vocab doc Section 12, #1 through #14)
     * against a proposed week. Issue order in the result follows table order.
     */
    public validate(proposedWeek: WeekContainer, context: ValidateContext): Result<WeekContainer> {
        // Compute fresh WeekMetadata once. Do NOT assign it to the week yet.
        const metadata = this.summarize(proposedWeek);

        const issues: Issue[] = [
            ...this.checkOutOfHoursUntagged(proposedWeek),          // #1
            ...this.checkDailyMaxExceeded(proposedWeek),            // #2
            ...this.checkSoftCap(metadata),                         // #3
            ...this.checkHardCap(proposedWeek, metadata),           // #4
            ...this.checkFragmentMinimum(proposedWeek),             // #5
            ...this.checkFrozenEntities(proposedWeek, context),     // #6
            ...this.checkDependencyOrder(proposedWeek),             // #7
            ...this.checkTaskFitsContainer(proposedWeek),           // #8
            ...this.checkDaySpanAtRisk(proposedWeek),               // #9
            ...this.checkContainerOverflow(proposedWeek),           // #10
            ...this.checkUnplacedTasks(proposedWeek),               // #11
            ...this.checkDeadlineFeasibility(proposedWeek),         // #12
            ...this.checkContainersExceedContract(context),         // #13
            ...this.checkEntryOrigin(proposedWeek),                 // #14
        ];

        const hasViolations = issues.some(issue => issue.level === 'violation');

        if (hasViolations) {
            // Caller rejects the commit and preserves the live week.
            return { ok: false, issues };
        }

        // Only mutate the proposed week on success.
        proposedWeek.metadata = metadata;
        return { ok: true, data: proposedWeek, issues };
    }

    // --- Tier 0: Self-contained validators ---

    /** #3 ~ SOFT_CAP_BREACH (warning) */
    private checkSoftCap(metadata: WeekMetadata): Issue[] {
        if (metadata.scheduled > SCHEDULER_RULES.CONTRACT_SOFT_CAP_MINUTES) {
            const excess = metadata.scheduled - SCHEDULER_RULES.CONTRACT_SOFT_CAP_MINUTES;
            return [{
                level: 'warning',
                code: 'SOFT_CAP_BREACH',
                message: `Scheduled hours exceed the contract by ${excess} minutes.`
            }];
        }
        return [];
    }

    /** #4 ~ HARD_CAP_BREACH (violation). */
    private checkHardCap(week: WeekContainer, metadata: WeekMetadata): Issue[] {
        const limit = SCHEDULER_RULES.LEGAL_HARD_CAP_MINUTES;
        if (metadata.scheduled <= limit) return [];

        const excess = metadata.scheduled - limit;

        // Deferral candidates, lowest pseudo-priority first (urgency + complexity).
        const candidateTasks = [...week.tasks]
            .filter(t => t.placement === 'placed')
            .sort((a, b) => (a.urgency + a.complexity) - (b.urgency + b.complexity))
            .map(t => t.id);

        return [{
            level: 'violation',
            code: 'HARD_CAP_BREACH',
            message: `Scheduled hours breach the legal maximum by ${excess} minutes.`,
            entityIds: candidateTasks
        }];
    }

    /**
     * #6 ~ FROZEN_ENTITY_MOVED (violation)
     * Every category honours ctx.bumpedEntityIds. Any service that legitimately
     * edits or deletes a frozen entity must pass its id in bumpedEntityIds.
     */
    private checkFrozenEntities(week: WeekContainer, ctx: ValidateContext): Issue[] {
        if (!ctx.previousWeek) return []; // First commit of the week: nothing to compare against

        const bumpedIds = new Set(ctx.bumpedEntityIds || []);

        return [
            ...this.checkFrozenBlocks(week, ctx.previousWeek, bumpedIds),
            ...this.checkFrozenTasks(week, ctx.previousWeek, bumpedIds),
            ...this.checkFrozenSlots(week, ctx.previousWeek, bumpedIds),
            ...this.checkFrozenEntries(week, ctx.previousWeek, bumpedIds),
        ];
    }

    private checkFrozenBlocks(week: WeekContainer, prevWeek: WeekContainer, bumpedIds: Set<string>): Issue[] {
        const issues: Issue[] = [];
        const currentBlocks = new Map(week.blocks.map(b => [b.id, b]));

        for (const prev of prevWeek.blocks) {
            if (prev.mobility !== 'pinned' || bumpedIds.has(prev.id)) continue;

            const current = currentBlocks.get(prev.id);

            if (current?.start !== prev.start || current?.end !== prev.end) {
                issues.push({ level: 'violation', code: 'FROZEN_ENTITY_MOVED', entityIds: [prev.id], message: `Pinned block ${prev.id} was moved.` });
            }
        }
        return issues;
    }

    private checkFrozenTasks(week: WeekContainer, prevWeek: WeekContainer, bumpedIds: Set<string>): Issue[] {
        const issues: Issue[] = [];
        const currentTasks = new Map(week.tasks.map(t => [t.id, t]));

        for (const prev of prevWeek.tasks) {
            if ((prev.status !== 'InProgress' && prev.status !== 'Done') || bumpedIds.has(prev.id)) continue;

            const current = currentTasks.get(prev.id);
            const isStatusValid = (prev.status === 'InProgress' && current?.status === 'Done') || (prev.status === current?.status);

            if (current?.placement !== prev.placement || !isStatusValid) {
                issues.push({ level: 'violation', code: 'FROZEN_ENTITY_MOVED', entityIds: [prev.id], message: `Frozen task ${prev.id} mutated.` });
            }
        }
        return issues;
    }

    private checkFrozenSlots(week: WeekContainer, prevWeek: WeekContainer, bumpedIds: Set<string>): Issue[] {
        const issues: Issue[] = [];
        const currentSlots = new Map(week.slots.map(s => [s.id, s]));

        for (const prev of prevWeek.slots) {
            if (!prev.locked || bumpedIds.has(prev.id)) continue;

            const current = currentSlots.get(prev.id);
            if (
                current?.start !== prev.start ||
                current?.end !== prev.end ||
                current?.blockId !== prev.blockId ||
                current?.taskIds?.join() !== prev.taskIds?.join()
            ) {
                issues.push({ level: 'violation', code: 'FROZEN_ENTITY_MOVED', entityIds: [prev.id], message: `Locked slot ${prev.id} moved.` });
            }
        }
        return issues;
    }

    private checkFrozenEntries(week: WeekContainer, prevWeek: WeekContainer, bumpedIds: Set<string>): Issue[] {
        const issues: Issue[] = [];
        const currentEntries = new Map(week.calendarEntries.map(e => [e.id, e]));

        for (const prev of prevWeek.calendarEntries) {
            if (bumpedIds.has(prev.id)) continue;

            const current = currentEntries.get(prev.id);
            if (current?.start !== prev.start || current?.end !== prev.end) {
                issues.push({ level: 'violation', code: 'FROZEN_ENTITY_MOVED', entityIds: [prev.id], message: `Calendar entry ${prev.id} moved.` });
            }
        }
        return issues;
    }

    /** #7 ~ DEPENDENCY_ORDER (violation) */
    private checkDependencyOrder(week: WeekContainer): Issue[] {
        const issues: Issue[] = [];
        const taskSlotsMap = this.mapTasksToSlots(week.slots);
        const taskById = new Map(week.tasks.map(t => [t.id, t]));

        for (const task of week.tasks) {
            if (!task.dependsOn || task.dependsOn.length === 0) continue;

            const dependentStart = this.getEarliestStart(taskSlotsMap.get(task.id) || []);
            if (dependentStart === null) continue;

            issues.push(...this.getDependencyIssuesForTask(task, dependentStart, taskSlotsMap, taskById));
        }
        return issues;
    }

    private getDependencyIssuesForTask(
        task: Task,
        dependentStart: number,
        taskSlotsMap: Map<string, Slot[]>,
        taskById: Map<string, Task>
    ): Issue[] {
        const issues: Issue[] = [];

        for (const prereqId of task.dependsOn || []) {
            if (taskById.get(prereqId)?.status === 'Done') continue;

            const prereqSlots = taskSlotsMap.get(prereqId) || [];
            if (prereqSlots.length === 0) continue;

            const prereqEnd = this.getLatestEnd(prereqSlots);
            if (prereqEnd !== null && dependentStart < prereqEnd) {
                issues.push({
                    level: 'violation',
                    code: 'DEPENDENCY_ORDER',
                    message: `Task ${task.id} starts before prerequisite ${prereqId} finishes.`,
                    entityIds: [task.id, prereqId]
                });
            }
        }

        return issues;
    }
    /** #8 ~ TASK_LARGER_THAN_CONTAINER (violation) */
    private checkTaskFitsContainer(week: WeekContainer): Issue[] {
        const issues: Issue[] = [];
        const projectAllocations = this.projectAllocations(week);

        for (const task of week.tasks.filter(t => t.placement === 'placed' && t.status !== 'Done')) {
            const allocated = projectAllocations.get(task.projectId);
            if (allocated !== undefined && task.tMax > allocated) {
                issues.push({
                    level: 'violation',
                    code: 'TASK_LARGER_THAN_CONTAINER',
                    message: `Task ${task.id} (${task.tMax}m) exceeds project ${task.projectId} allocation (${allocated}m).`,
                    entityIds: [task.id]
                });
            }
        }
        return issues;
    }

    /** #10 ~ CONTAINER_OVERFLOW (warning) */
    private checkContainerOverflow(week: WeekContainer): Issue[] {
        const issues: Issue[] = [];
        const projectTaskSums = new Map<string, { totalTMax: number; taskIds: string[] }>();

        for (const task of week.tasks) {
            const current = projectTaskSums.get(task.projectId) || { totalTMax: 0, taskIds: [] };
            current.totalTMax += task.tMax;
            current.taskIds.push(task.id);
            projectTaskSums.set(task.projectId, current);
        }

        const projectAllocations = this.projectAllocations(week);

        for (const [projectId, data] of projectTaskSums.entries()) {
            const allocated = projectAllocations.get(projectId) || 0;
            if (data.totalTMax > allocated) {
                issues.push({
                    level: 'warning',
                    code: 'CONTAINER_OVERFLOW',
                    message: `Project ${projectId} tasks (${data.totalTMax}m) overflow allocation (${allocated}m).`,
                    entityIds: data.taskIds
                });
            }
        }
        return issues;
    }

    /** #11 ~ UNPLACED_TASKS (warning) */
    private checkUnplacedTasks(week: WeekContainer): Issue[] {
        const ids = week.tasks.filter(t => t.placement === 'unplaced').map(t => t.id);
        return ids.length > 0
            ? [{
                level: 'warning',
                code: 'UNPLACED_TASKS',
                message: `There are ${ids.length} unplaced tasks.`,
                entityIds: ids
            }]
            : [];
    }

    /**
     * #12 — DEADLINE_INFEASIBLE (warning)
     * Currently trusts the placer's unplacedReason flag.
     */
    private checkDeadlineFeasibility(week: WeekContainer): Issue[] {
        const ids = week.tasks.filter(t => t.unplacedReason === 'DEADLINE_INFEASIBLE').map(t => t.id);
        return ids.length > 0
            ? [{
                level: 'warning',
                code: 'DEADLINE_INFEASIBLE',
                message: `${ids.length} task(s) cannot be placed before their deadline.`,
                entityIds: ids
            }]
            : [];
    }

    /** #14 — INVALID_ENTRY_ORIGIN (violation, defensive-only) */
    private checkEntryOrigin(week: WeekContainer): Issue[] {
        const issues: Issue[] = [];
        for (const entry of week.calendarEntries) {
            if (entry.origin === 'public-holiday') {
                const entryDate = this.timeService.localDate(entry.start, week.timezone);
                const hasMatchingHoliday = week.holidays.some(h => h.date === entryDate);
                if (!hasMatchingHoliday) {
                    issues.push({
                        level: 'violation',
                        code: 'INVALID_ENTRY_ORIGIN',
                        message: `Entry ${entry.id} is marked as public-holiday but no holiday exists on ${entryDate}.`,
                        entityIds: [entry.id]
                    });
                }
            }
        }
        return issues;
    }

    // --- Tier 1: Validators needing TimeService or placement-service data ---

    /** #1 ~ OUT_OF_HOURS_UNTAGGED (violation) */
    private checkOutOfHoursUntagged(week: WeekContainer): Issue[] {
        const issues: Issue[] = [];

        for (const slot of week.slots) {
            if (!this.isWithinCoreHours(slot.start, slot.end, week.timezone) && !this.hasOutOfHoursTag(slot.tags)) {
                issues.push({
                    level: 'violation',
                    code: 'OUT_OF_HOURS_UNTAGGED',
                    entityIds: [slot.id],
                    message: `Slot ${slot.id} falls outside core hours but lacks explicit confirmation tags.`
                });
            }
        }

        for (const entry of week.calendarEntries) {
            if (!this.isWithinCoreHours(entry.start, entry.end, week.timezone) && !this.hasOutOfHoursTag(entry.tags)) {
                issues.push({
                    level: 'violation',
                    code: 'OUT_OF_HOURS_UNTAGGED',
                    entityIds: [entry.id],
                    message: `Calendar entry ${entry.id} falls outside core hours but lacks explicit confirmation tags.`
                });
            }
        }
        return issues;
    }

    /** #2 ~ DAILY_MAX_EXCEEDED (violation) */
    private checkDailyMaxExceeded(week: WeekContainer): Issue[] {
        const issues: Issue[] = [];
        const dailyTotals = new Map<string, { total: number; entityIds: string[] }>();

        const processEntity = (id: string, start: string, end: string) => {
            const day = this.timeService.localDate(start, week.timezone);
            const duration = this.durationMinutes(start, end);
            const current = dailyTotals.get(day) || { total: 0, entityIds: [] };
            current.total += duration;
            current.entityIds.push(id);
            dailyTotals.set(day, current);
        };

        week.slots.forEach(s => processEntity(s.id, s.start, s.end));
        week.calendarEntries.forEach(e => processEntity(e.id, e.start, e.end));

        for (const [day, data] of dailyTotals.entries()) {
            if (data.total > SCHEDULER_RULES.DAILY_MAX_MINUTES) {
                issues.push({
                    level: 'violation',
                    code: 'DAILY_MAX_EXCEEDED',
                    entityIds: data.entityIds,
                    message: `Scheduled time on ${day} is ${data.total}m, exceeding the daily limit of ${SCHEDULER_RULES.DAILY_MAX_MINUTES}m.`
                });
            }
        }
        return issues;
    }

    /** #5 ~ FRAGMENT_TOO_SMALL (violation) */
    private checkFragmentMinimum(week: WeekContainer): Issue[] {
        const issues: Issue[] = [];
        for (const slot of week.slots) {
            if (slot.kind === 'batch') continue;
            const duration = this.durationMinutes(slot.start, slot.end);
            if (duration < SCHEDULER_RULES.MIN_BLOCK_MINUTES) {
                issues.push({
                    level: 'violation',
                    code: 'FRAGMENT_TOO_SMALL',
                    entityIds: [slot.id],
                    message: `Slot ${slot.id} is ${duration}m, below the ${SCHEDULER_RULES.MIN_BLOCK_MINUTES}m minimum.`
                });
            }
        }
        return issues;
    }

    /**
     * #9 ~ DAY_SPAN_LIMIT_AT_RISK (warning at save)
     * OPEN QUESTION: confirm FRAGMENT_MAX_COUNT means "max days a task may span"
     */
    private checkDaySpanAtRisk(week: WeekContainer): Issue[] {
        const maxCapacity = SCHEDULER_RULES.FRAGMENT_MAX_COUNT * SCHEDULER_RULES.DAILY_MAX_MINUTES;
        const ids = week.tasks.filter(t => t.tMax > maxCapacity).map(t => t.id);
        return ids.length > 0
            ? [{
                level: 'warning',
                code: 'DAY_SPAN_LIMIT_AT_RISK',
                entityIds: ids,
                message: `${ids.length} task(s) exceed the theoretical max capacity of ${maxCapacity}m over ${SCHEDULER_RULES.FRAGMENT_MAX_COUNT} days.`
            }]
            : [];
    }

    /**
     * #13 ~ CONTAINERS_EXCEED_CONTRACT (violation, defensive-only)
     * Should be impossible given the placement service's capacity check.
     */
    private checkContainersExceedContract(context: ValidateContext): Issue[] {
        if (!context.allocations || context.allocations.length === 0) return [];

        const cap = SCHEDULER_RULES.CONTRACT_SOFT_CAP_MINUTES;

        // Sum unrounded minutes and round once, so per-allocation rounding
        // can't create a false positive.
        let sumFloat = 0;
        for (const alloc of context.allocations) {
            sumFloat += (alloc.allocation / 100) * cap;
        }
        const sumMinutes = Math.round(sumFloat);

        if (sumMinutes > cap) {
            this.logger.error(
                `CONTAINERS_EXCEED_CONTRACT: total project allocations (${sumMinutes}m) exceed contract hours (${cap}m) across ${context.allocations.length} allocations. Upstream placement bug.`
            );
            return [{
                level: 'violation',
                code: 'CONTAINERS_EXCEED_CONTRACT',
                persistent: true,
                message: `Total project allocations (${sumMinutes}m) exceed contract hours (${cap}m).`
            }];
        }
        return [];
    }

    // --- Summary ---

    /**
     * Derives WeekMetadata from the week's current contents.
     */
    public summarize(week: WeekContainer): WeekMetadata {
        let available = 0;
        const windows = this.timeService.workingWindows(week.weekStart, week.timezone);
        const holidayDates = new Set(week.holidays.map(h => h.date));

        // 1. Available minutes: working windows minus holidays and calendar entries
        const activeWindows = windows.filter(
            w => !holidayDates.has(this.timeService.localDate(w.start, week.timezone))
        );

        for (const w of activeWindows) {
            const windowStart = new Date(w.start).getTime();
            const windowEnd = new Date(w.end).getTime();
            const windowDuration = (windowEnd - windowStart) / 60000;

            let overlapMinutes = 0;
            for (const entry of week.calendarEntries) {
                const eStart = new Date(entry.start).getTime();
                const eEnd = new Date(entry.end).getTime();
                const overlapStart = Math.max(windowStart, eStart);
                const overlapEnd = Math.min(windowEnd, eEnd);

                if (overlapEnd > overlapStart) {
                    overlapMinutes += (overlapEnd - overlapStart) / 60000;
                }
            }
            available += Math.max(0, windowDuration - overlapMinutes);
        }

        // 2. Allocated minutes (from project blocks)
        let allocated = 0;
        for (const block of week.blocks) allocated += block.allocatedMinutes;

        // 3. Scheduled minutes + out-of-hours / weekend flags
        let scheduled = 0;
        let hasOutOfHours = false;
        let hasWeekend = false;

        const checkFlags = (start: string, end: string) => {
            if (!this.isWithinCoreHours(start, end, week.timezone)) hasOutOfHours = true;
            if (this.isWeekendLocal(start, week.timezone)) hasWeekend = true;
        };

        for (const slot of week.slots) {
            scheduled += this.durationMinutes(slot.start, slot.end);
            checkFlags(slot.start, slot.end);
        }
        for (const entry of week.calendarEntries) {
            checkFlags(entry.start, entry.end);
        }

        // 4. Derivatives
        return {
            available,
            allocated,
            scheduled,
            buffer: available - scheduled,
            utilization: available > 0 ? scheduled / available : 0,
            softCapBreached: scheduled > SCHEDULER_RULES.CONTRACT_SOFT_CAP_MINUTES,
            hardCapBreached: scheduled > SCHEDULER_RULES.LEGAL_HARD_CAP_MINUTES,
            hasOutOfHours,
            hasWeekend,
            hasContainerOverflow: this.checkContainerOverflow(week).length > 0
        };
    }

    // --- Utility helpers ---

    private isWithinCoreHours(start: string, end: string, tz: string): boolean {
        return this.timeService.isInCoreHours(start, tz) && this.timeService.isInCoreHours(end, tz);
    }

    private isWeekendLocal(start: string, tz: string): boolean {
        const localDateIso = this.timeService.localDate(start, tz);
        const dow = new Date(localDateIso).getUTCDay(); // 0 = Sunday, 6 = Saturday
        return dow === 0 || dow === 6;
    }


    private hasOutOfHoursTag(tags?: string[]): boolean {
        return !!tags && (tags.includes('extended-hours') || tags.includes('weekend'));
    }

    private projectAllocations(week: WeekContainer): Map<string, number> {
        const map = new Map<string, number>();
        for (const block of week.blocks) {
            map.set(block.projectId, (map.get(block.projectId) || 0) + block.allocatedMinutes);
        }
        return map;
    }

    // private normalizeIds(ids?: string[]): string {
    //     return (ids ?? [])
    //         .slice()
    //         .sort((a, b) => a.localeCompare(b))
    //         .join(',');
    // }

    private durationMinutes(start: string, end: string): number {
        return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    }

    private mapTasksToSlots(slots: Slot[]): Map<string, Slot[]> {
        const map = new Map<string, Slot[]>();
        for (const slot of slots) {
            for (const taskId of (slot.taskIds || [])) {
                if (!map.has(taskId)) map.set(taskId, []);
                map.get(taskId)!.push(slot);
            }
        }
        return map;
    }

    private getEarliestStart(slots: Slot[]): number | null {
        if (!slots.length) return null;
        return Math.min(...slots.map(s => new Date(s.start).getTime()));
    }

    private getLatestEnd(slots: Slot[]): number | null {
        if (!slots.length) return null;
        return Math.max(...slots.map(s => new Date(s.end).getTime()));
    }
}