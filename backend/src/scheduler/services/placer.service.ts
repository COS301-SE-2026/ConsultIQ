import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { Task, Slot, Interval, AllocationSummary, WeekContainer, UnplacedReason, PlaceTaskResult, UnplacedTaskSummary, PlaceReport } from '../dto/scheduler.dto';
import { SCHEDULER_RULES } from './scheduler-rules.constant';
import { TimeService, Instant } from './time.service';


export interface FreeGap extends Interval {
    blockId: string;
}

@Injectable()
export class PlacerService {

    constructor(private readonly timeService: TimeService) { }

    /**
     * Tier 1: freeGaps
     * Returns placeable gaps inside a project's fluid blocks within a window.
     */
    public freeGaps(
        week: WeekContainer,
        projectId: string,
        window: Interval,
        options: { fillTarget?: number } = {}
    ): FreeGap[] {
        // Fill target: share of each block's free working time that tasks may use (1 - buffer)
        const fillTarget = options.fillTarget ?? (1 - SCHEDULER_RULES.BUFFER_TARGET_PERCENTAGE);

        // 1. Get this project's fluid blocks
        const fluidBlocks = week.blocks.filter(b => b.projectId === projectId && b.mobility === 'fluid');
        if (fluidBlocks.length === 0) return [];

        // 2. Ask TimeService for working windows (This inherently excludes weekends & handles unpaid lunch)
        const rawWorkWindows = this.timeService.workingWindows(week.weekStart, week.timezone);

        // Filter out public holidays from working windows
        const holidayDates = new Set(week.holidays.map(h => h.date));
        const workWindows = rawWorkWindows.filter(ww => {
            const localDate = this.timeService.localDate(ww.start, week.timezone);
            return !holidayDates.has(localDate);
        });

        // 3. Collect obstacles (Meetings, leave, ad-hoc, and already-placed sticky slots)
        const obstacles: Interval[] = [...week.calendarEntries, ...week.slots];

        const resultGaps: FreeGap[] = [];

        // Process each fluid block
        for (const block of fluidBlocks) {
            // Working time inside the block (core hours, minus lunch, minus holidays)
            const blockWorkIntervals = this.intersectMulti([{ start: block.start, end: block.end }], workWindows);

            // Capacity = the block's working time left after calendar entries.
            // Slots are NOT subtracted here, otherwise the buffer would shrink each time a task is placed.
            const capacityIntervals = this.subtractMulti(blockWorkIntervals, week.calendarEntries);
            const capacityMinutes = capacityIntervals.reduce((sum, i) => sum + this.intervalMinutes(i), 0);
            const allowedCapacity = Math.floor(capacityMinutes * fillTarget);

            const alreadyScheduledInBlock = week.slots
                .filter(s => s.blockId === block.id)
                .reduce((sum, s) => sum + this.intervalMinutes(s), 0);

            let remainingMinutesToFill = allowedCapacity - alreadyScheduledInBlock;
            if (remainingMinutesToFill <= 0) continue; // Target reached

            // Free gaps: working time within the requested window, minus calendar entries and existing slots
            let blockIntervals = this.intersectMulti(blockWorkIntervals, [window]);
            blockIntervals = this.subtractMulti(blockIntervals, obstacles);

            const freeGapsForBlock = blockIntervals.map(g => ({ ...g, blockId: block.id }));

            // Trim available gaps to respect the fill target limit
            for (const gap of freeGapsForBlock) {
                const gapMins = this.intervalMinutes(gap);

                if (gapMins <= remainingMinutesToFill) {
                    resultGaps.push(gap);
                    remainingMinutesToFill -= gapMins;
                } else {
                    // Trim this gap exactly to the remaining allowed minutes and stop
                    const startMs = new Date(gap.start).getTime();
                    const endIso = new Date(startMs + remainingMinutesToFill * 60000).toISOString().replace(/\.\d{3}Z$/, 'Z');

                    resultGaps.push({ start: gap.start, end: endIso, blockId: gap.blockId });
                    remainingMinutesToFill = 0;
                    break; // Block target hit
                }
            }
        }

        // Sort chronologically
        return resultGaps.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }

    // --- Interval Math Helpers ---

    // Accepts ISO strings (any format or offset) or Date objects
    private ms(value: string | Date): number {
        return new Date(value).getTime();
    }

    private getOverlap(a: Interval, b: Interval): Interval | null {
        const start = Math.max(this.ms(a.start), this.ms(b.start));
        const end = Math.min(this.ms(a.end), this.ms(b.end));
        if (start >= end) return null;
        return {
            start: start === this.ms(a.start) ? a.start : b.start,
            end: end === this.ms(a.end) ? a.end : b.end,
        };
    }

    private intersectMulti(sources: Interval[], targets: Interval[]): Interval[] {
        const result: Interval[] = [];
        for (const s of sources) {
            for (const t of targets) {
                const overlap = this.getOverlap(s, t);
                if (overlap) result.push(overlap);
            }
        }
        return result;
    }

    private subtractInterval(source: Interval, obstacle: Interval): Interval[] {
        const overlap = this.getOverlap(source, obstacle);
        if (!overlap) return [source]; // No overlap, return source unchanged

        const results: Interval[] = [];
        // Keep part before obstacle
        if (this.ms(source.start) < this.ms(overlap.start)) {
            results.push({ start: source.start, end: overlap.start });
        }
        // Keep part after obstacle
        if (this.ms(source.end) > this.ms(overlap.end)) {
            results.push({ start: overlap.end, end: source.end });
        }
        return results;
    }

    private subtractMulti(sources: Interval[], obstacles: Interval[]): Interval[] {
        let current = [...sources];
        for (const obs of obstacles) {
            const next: Interval[] = [];
            for (const c of current) {
                next.push(...this.subtractInterval(c, obs));
            }
            current = next;
        }
        return current;
    }

    // --- Tier 0 Primitives ---

    public roundUp(minutes: number, unit: number): number {
        return Math.ceil(minutes / unit) * unit;
    }

    public remainingMinutes(task: Task, stickySlots: Slot[] = []): number {
        const coveredMinutes = stickySlots.reduce((sum, slot) => {
            return sum + this.intervalMinutes({ start: slot.start, end: slot.end });
        }, 0);
        return Math.max(0, task.tMax - coveredMinutes);
    }

    public clipToDeadline(gap: FreeGap, deadline?: Instant): FreeGap {
        if (!deadline) return gap;
        const gapEnd = new Date(gap.end).getTime();
        const deadlineTime = new Date(deadline).getTime();
        if (gapEnd <= deadlineTime) return gap;
        return { ...gap, end: deadline };
    }

    public intervalMinutes(interval: Interval): number {
        const start = new Date(interval.start).getTime();
        const end = new Date(interval.end).getTime();
        return Math.round((end - start) / 60000);
    }

    private clampWindowToNow(window: Interval, nowMs: number = Date.now()): Interval | null {
        const QUARTER_MS = 15 * 60_000;
        const windowStartMs = this.ms(window?.start);
        const windowEndMs = this.ms(window?.end);

        // Missing or unparseable window: nothing can be placed
        if (!Number.isFinite(windowStartMs) || !Number.isFinite(windowEndMs)) return null;

        const roundedNowMs = Math.ceil(nowMs / QUARTER_MS) * QUARTER_MS;
        const startMs = Math.max(windowStartMs, roundedNowMs);
        if (startMs >= windowEndMs) return null;

        return {
            start: (startMs === windowStartMs
                ? window.start
                : new Date(startMs).toISOString().replace(/\.\d{3}Z$/, 'Z')) as Instant,
            end: window.end,
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public makeSlot(task: Task, gap: FreeGap, minutes: number): Slot {

        const start = new Date(gap.start);
        const end = new Date(start.getTime() + minutes * 60000);
        return {
            id: crypto.randomUUID(),
            weekId: task.weekId,
            kind: 'task',
            blockId: gap.blockId,
            start: start.toISOString().replace(/\.\d{3}Z$/, 'Z'),
            end: end.toISOString().replace(/\.\d{3}Z$/, 'Z'),
            locked: false,
            daySpan: 0,
            taskIds: [task.id],
            subtaskIds: []
        };
    }

    public withDaySpanLabels(slots: Slot[]): Slot[] {
        const taskGroups = new Map<string, Slot[]>();
        for (const slot of slots) {
            if (slot.kind !== 'task' || !slot.taskIds || slot.taskIds.length === 0) continue;
            const taskId = slot.taskIds[0];
            if (!taskGroups.has(taskId)) taskGroups.set(taskId, []);
            taskGroups.get(taskId)!.push(slot);
        }
        for (const group of taskGroups.values()) {
            group.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
            group.forEach((slot, index) => {
                slot.daySpan = index + 1;
            });
        }
        return slots;
    }

    public priorityScore(task: Task, now: Instant): number {
        const urgencyWeight = 0.25;
        const complexityWeight = 0.15;
        const deadlineWeight = 0.60;

        let deadlineScore = 0;

        if (task.deadline) {
            const nowTime = new Date(now).getTime();
            const deadlineTime = new Date(task.deadline).getTime();

            const hoursToDeadline =
                (deadlineTime - nowTime) / 3_600_000;

            if (hoursToDeadline <= 1) {
                deadlineScore = 1;
            } else if (hoursToDeadline <= 8) {
                deadlineScore = 0.9;
            } else if (hoursToDeadline <= 24) {
                deadlineScore = 0.75;
            } else if (hoursToDeadline <= 72) {
                deadlineScore = 0.5;
            } else if (hoursToDeadline <= 168) {
                deadlineScore = 0.25;
            } else {
                deadlineScore = 0.1;
            }
        }

        const MAX_URGENCY = SCHEDULER_RULES.URGENCY_MAX;
        const MAX_COMPLEXITY = SCHEDULER_RULES.COMPLEXITY_MAX;


        return (
            (task.urgency / MAX_URGENCY) * urgencyWeight +
            (task.complexity / MAX_COMPLEXITY) * complexityWeight +
            deadlineScore * deadlineWeight
        );
    }

    public blockMinutes(placement: AllocationSummary): number {
        const dailyMinutes = SCHEDULER_RULES.CONTRACT_SOFT_CAP_MINUTES / SCHEDULER_RULES.WORKING_DAYS_PER_WEEK;
        return Math.round((placement.allocation / 100) * dailyMinutes);
    }

    /**
   * Tier 2: diagnose
   * Classifies why a task failed to place and returns a summary for the UI tray.
   */
    public diagnose(week: WeekContainer, task: Task, window: Interval): UnplacedTaskSummary {
        const stickySlots = week.slots.filter(s => s.taskIds?.includes(task.id));
        const neededMinutes = this.remainingMinutes(task, stickySlots);

        const gaps = this.freeGaps(week, task.projectId, window);
        const availableMinutes = gaps.reduce((sum, g) => sum + this.intervalMinutes(g), 0);

        let reason: UnplacedReason = 'CONTAINER_FULL';

        // 1. Would it fit if we ignored the day-span cap (but respected the deadline)?
        if (this.canFit(task, gaps, neededMinutes, Infinity, !task.deadlineMissAccepted, week.timezone)) {
            reason = 'DAY_SPAN_LIMIT';
        }
        // 2. Would it fit if we ignored BOTH the day-span cap AND the deadline?
        else if (this.canFit(task, gaps, neededMinutes, Infinity, false, week.timezone)) {
            reason = 'DEADLINE_INFEASIBLE';
        }

        return {
            reason,
            neededMinutes,
            availableMinutes,
            deadline: task.deadline
        };
    }

    /**
     * Shared Gap-Walking Logic (extracted for diagnose and placeTask)
     * Walks chronologically through gaps to see if a task can be satisfied.
     */
    public canFit(
        task: Task,
        gaps: FreeGap[],
        neededMinutes: number,
        maxDays: number,
        enforceDeadline: boolean,
        timezone: string
    ): boolean {
        if (neededMinutes <= 0) return true;

        let accumulated = 0;
        const daysUsed = new Set<string>();

        for (const gap of gaps) {
            if (accumulated >= neededMinutes) break;

            accumulated += this.evaluateGapForFit(
                gap, task, neededMinutes - accumulated, daysUsed, maxDays, enforceDeadline, timezone
            );
        }

        return accumulated >= neededMinutes;
    }

    private evaluateGapForFit(
        gap: FreeGap,
        task: Task,
        missingMinutes: number,
        daysUsed: Set<string>,
        maxDays: number,
        enforceDeadline: boolean,
        timezone: string
    ): number {
        const workingGap = enforceDeadline ? this.clipToDeadline(gap, task.deadline as Instant) : gap;
        const gapMins = this.intervalMinutes(workingGap);

        if (gapMins <= 0) return 0;

        // Ensure we don't create fragments smaller than the minimum block size,
        // unless it's the final tiny piece needed to finish the task.
        if (gapMins < SCHEDULER_RULES.MIN_BLOCK_MINUTES && gapMins < missingMinutes) {
            return 0;
        }

        const day = this.timeService.localDate(workingGap.start, timezone);

        if (!daysUsed.has(day)) {
            if (daysUsed.size >= maxDays) return 0; // Exceeds day cap
            daysUsed.add(day);
        }

        return Math.min(gapMins, missingMinutes);
    }

    /**
   * Tier 2: batchMicroTasks
   * Groups tasks under the minimum block size into rounded-up, per-project daily batch slots.
   */
    public batchMicroTasks(
        week: WeekContainer,
        tasks: Task[],
        window: Interval
    ): { batched: Slot[]; remaining: Task[] } {
        const { microTasksByProject, remaining } = this.splitMicroTasks(tasks);
        const batched: Slot[] = [];
        const nowIso = new Date().toISOString() as Instant;

        for (const [projectId, projectMicroTasks] of microTasksByProject.entries()) {
            const gaps = this.freeGaps(week, projectId, window);
            const gapsByDay = this.mapGapsToDays(gaps, week.timezone);

            this.sortMicroTasks(projectMicroTasks, nowIso);

            const { newSlots, unbatched } = this.buildProjectBatches(week, projectMicroTasks, gapsByDay);

            batched.push(...newSlots);
            remaining.push(...unbatched);
        }

        return { batched, remaining };
    }

    // Helper 1: Group tasks by size
    private splitMicroTasks(tasks: Task[]): { microTasksByProject: Map<string, Task[]>; remaining: Task[] } {
        const microTasksByProject = new Map<string, Task[]>();
        const remaining: Task[] = [];

        for (const task of tasks) {
            if (task.tMax < SCHEDULER_RULES.MIN_BLOCK_MINUTES) {
                if (!microTasksByProject.has(task.projectId)) {
                    microTasksByProject.set(task.projectId, []);
                }
                microTasksByProject.get(task.projectId)!.push(task);
            } else {
                remaining.push(task);
            }
        }
        return { microTasksByProject, remaining };
    }

    // Helper 2: Map gaps to their local days
    private mapGapsToDays(gaps: FreeGap[], timezone: string): Map<string, FreeGap[]> {
        const gapsByDay = new Map<string, FreeGap[]>();
        for (const gap of gaps) {
            const day = this.timeService.localDate(gap.start, timezone);
            if (!gapsByDay.has(day)) gapsByDay.set(day, []);
            gapsByDay.get(day)!.push(gap);
        }
        return gapsByDay;
    }

    // Helper 3: Sort micro-tasks by deadline and priority
    private sortMicroTasks(tasks: Task[], now: Instant): void {
        tasks.sort((a, b) => {
            if (a.deadline && b.deadline) {
                const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                if (diff !== 0) return diff;
            } else if (a.deadline && !b.deadline) {
                return -1;
            } else if (!a.deadline && b.deadline) {
                return 1;
            }
            return this.priorityScore(b, now) - this.priorityScore(a, now);
        });
    }

    // Helper 4: The Core Batching Logic (Restored!)
    private buildProjectBatches(
        week: WeekContainer,
        tasks: Task[],
        gapsByDay: Map<string, FreeGap[]>
    ): { newSlots: Slot[]; unbatched: Task[] } {
        const newSlots: Slot[] = [];
        const unbatched: Task[] = [];
        const minBlock = SCHEDULER_RULES.MIN_BLOCK_MINUTES;
        let taskIdx = 0;

        for (const gaps of gapsByDay.values()) {
            for (const gap of gaps) {
                if (taskIdx >= tasks.length) break;
                taskIdx = this.processGapForBatches(week, gap, tasks, taskIdx, minBlock, newSlots);
            }
        }

        // Push any tasks that couldn't fit into the week's gaps to 'unbatched'
        for (; taskIdx < tasks.length; taskIdx++) {
            unbatched.push(tasks[taskIdx]);
        }

        return { newSlots, unbatched };
    }

    private processGapForBatches(
        week: WeekContainer,
        gap: FreeGap,
        tasks: Task[],
        initialTaskIdx: number,
        minBlock: number,
        newSlots: Slot[]
    ): number {
        let gapRemainingMins = this.intervalMinutes(gap);
        let currentStartMs = new Date(gap.start).getTime();
        let taskIdx = initialTaskIdx;

        while (taskIdx < tasks.length && gapRemainingMins >= minBlock) {
            const { batchMins, batchTaskIds, nextTaskIdx } = this.packTasksIntoBatch(
                tasks, taskIdx, gapRemainingMins, minBlock
            );

            if (batchTaskIds.length === 0) break;

            const slotDuration = Math.max(minBlock, batchMins);
            const endMs = currentStartMs + (slotDuration * 60000);

            newSlots.push({
                id: crypto.randomUUID(),
                weekId: week.id,
                kind: 'batch',
                blockId: gap.blockId,
                start: new Date(currentStartMs).toISOString() as Instant,
                end: new Date(endMs).toISOString() as Instant,
                taskIds: batchTaskIds,
                locked: false,
            });

            currentStartMs = endMs;
            gapRemainingMins -= slotDuration;
            taskIdx = nextTaskIdx;
        }

        return taskIdx;
    }


    private packTasksIntoBatch(
        tasks: Task[],
        startIdx: number,
        gapRemainingMins: number,
        minBlock: number
    ): { batchMins: number; batchTaskIds: string[]; nextTaskIdx: number } {
        let batchMins = 0;
        const batchTaskIds: string[] = [];
        let taskIdx = startIdx;

        while (taskIdx < tasks.length) {
            const task = tasks[taskIdx];
            if (batchMins + task.tMax <= gapRemainingMins) {
                batchMins += task.tMax;
                batchTaskIds.push(task.id);
                taskIdx++;

                if (batchMins >= minBlock) break;
            } else {
                break;
            }
        }

        return { batchMins, batchTaskIds, nextTaskIdx: taskIdx };
    }
    /**
     * Tier 3: placeTask
     * Attempts to fragment and place a task. Shrinks fragments to avoid unplaceable tails.
     */
    public placeTask(
        week: WeekContainer,
        task: Task,
        window: Interval,
        allowBump: boolean
    ): PlaceTaskResult {
        const stickySlots = week.slots.filter(s => s.taskIds?.includes(task.id));
        const rawRemaining = this.remainingMinutes(task, stickySlots);
        const need = this.roundUp(rawRemaining, SCHEDULER_RULES.MIN_BLOCK_MINUTES);
        if (need <= 0) return { ok: true, data: [] }; // already has all its time

        const gaps = this.freeGaps(week, task.projectId, window);
        const { plan, remaining } = this.planFragments(task, gaps, need, week.timezone);
        const fitsInFreeTime = remaining === 0;

        if (allowBump) {
            // Go ahead of less important work, or make room when it doesn't fit at all
            const preempted = this.tryPreempt(week, task, window, fitsInFreeTime ? plan : null);
            if (preempted.ok) return preempted;
        }

        if (fitsInFreeTime) return { ok: true, data: this.withDaySpanLabels(plan) };
        return { ok: false, summary: this.diagnose(week, task, window) };
    }

    private planFragments(
        task: Task,
        gaps: FreeGap[],
        need: number,
        timezone: string
    ): { plan: Slot[]; remaining: number } {
        const plan: Slot[] = [];
        const daysUsed = new Set();
        let remaining = need;
        const deadline = task.deadlineMissAccepted ? undefined : task.deadline;

        for (const gap of gaps) {
            if (remaining <= 0) break;

            if (deadline) {
                const gapStartMs = new Date(gap.start).getTime();
                const deadlineMs = new Date(deadline).getTime();
                if (gapStartMs >= deadlineMs) break;
            }

            const day = this.timeService.localDate(gap.start, timezone);

            if (!daysUsed.has(day) && daysUsed.size >= SCHEDULER_RULES.FRAGMENT_MAX_COUNT) {
                break;
            }

            const take = this.calculateTakeForGap(gap, deadline as Instant | undefined, remaining);

            if (take < SCHEDULER_RULES.MIN_BLOCK_MINUTES) continue;

            plan.push(this.makeSlot(task, gap, take));
            daysUsed.add(day);
            remaining -= take;
        }

        return { plan, remaining };
    }


    private calculateTakeForGap(gap: FreeGap, deadline: Instant | undefined, remaining: number): number {
        const usable = this.clipToDeadline(gap, deadline);
        let take = Math.min(this.intervalMinutes(usable), remaining);
        const left = remaining - take;


        if (left > 0 && left < SCHEDULER_RULES.MIN_BLOCK_MINUTES) {
            take -= (SCHEDULER_RULES.MIN_BLOCK_MINUTES - left);
        }

        return take;
    }


    /**
     * Tier 3: tryPreempt
     * fits (freePlan given): move every less important task in front of the attacker, so it goes first.
     * doesn't fit (freePlan null): move as few tasks as possible, least important first, until it fits.
     * Moved tasks must all be re-placed within their deadlines, or the week is rolled back.
     */
    public tryPreempt(week: WeekContainer, attacker: Task, window: Interval, freePlan: Slot[] | null): PlaceTaskResult {
        const nowIso = new Date().toISOString() as Instant;

        // Where the attacker lands without moving anything; tasks starting before that are "in front"
        const horizonMs = freePlan
            ? Math.max(...freePlan.map((s) => new Date(s.end).getTime()))
            : new Date(window.end).getTime();

        const candidates = this.getPreemptionCandidates(week, attacker, window, horizonMs, freePlan !== null)
            .sort((a, b) => this.priorityScore(a, nowIso) - this.priorityScore(b, nowIso)); // least important first

        if (candidates.length === 0) {
            return { ok: false, summary: this.diagnose(week, attacker, window), code: 'NO_BUMP_CANDIDATE' };
        }

        if (freePlan) {
            return this.simulatePreemption(week, attacker, candidates, window);
        }

        for (let count = 1; count <= candidates.length; count++) {
            const result = this.simulatePreemption(week, attacker, candidates.slice(0, count), window);
            if (result.ok) return result;
        }

        return { ok: false, summary: this.diagnose(week, attacker, window), code: 'BUMP_FAILED' };
    }

    private getPreemptionCandidates(
        week: WeekContainer,
        attacker: Task,
        window: Interval,
        horizonMs: number,
        fitsInFreeTime: boolean,
    ): Task[] {
        const nowIso = new Date().toISOString() as Instant;
        const windowStartMs = new Date(window.start).getTime();
        const attackerScore = this.priorityScore(attacker, nowIso);
        const attackerDeadline = this.effectiveDeadlineMs(attacker);

        return week.tasks.filter((t) => {
            // Only the attacker's own project: it can only use that project's blocks
            if (t.id === attacker.id || t.projectId !== attacker.projectId) return false;
            if (t.status !== 'Ready') return false;

            const slots = week.slots.filter((s) => s.taskIds?.includes(t.id));
            if (slots.length === 0) return false;

            // Never move hand-placed work, batched micro-tasks, or tasks with time already in the past
            if (slots.some((s) => s.locked || s.kind !== 'task')) return false;
            if (slots.some((s) => new Date(s.start).getTime() < windowStartMs)) return false;

            const inFront = slots.some((s) => new Date(s.start).getTime() < horizonMs);
            if (!inFront) return false;

            const lowerPriority = this.priorityScore(t, nowIso) < attackerScore;
            // Deadline rescue: a task that can't fit may move tasks due later, whatever their priority,
            // as long as they still meet their own deadline when re-placed
            const deadlineRescue = !fitsInFreeTime && this.effectiveDeadlineMs(t) > attackerDeadline;

            return lowerPriority || deadlineRescue;
        });
    }

    private effectiveDeadlineMs(task: Task): number {
        if (!task.deadline || task.deadlineMissAccepted) return Infinity;
        return new Date(task.deadline as unknown as string).getTime();
    }

    private simulatePreemption(week: WeekContainer, attacker: Task, candidateTasks: Task[], window: Interval): PlaceTaskResult {
        // Take snapshot for rollback
        const snapshotSlots = JSON.stringify(week.slots);
        const snapshotTasks = JSON.stringify(week.tasks);

        // Release candidates' slots and mark as unplaced
        const candidateIds = new Set(candidateTasks.map(t => t.id));

        week.slots = week.slots.filter(s => !s.taskIds?.some(id => candidateIds.has(id)));

        candidateTasks.forEach(c => {
            const wt = week.tasks.find(t => t.id === c.id);
            if (wt) wt.placement = 'unplaced';
        });

        const attackerResult = this.placeTask(week, attacker, window, false);
        if (!attackerResult.ok) {
            this.rollback(week, snapshotSlots, snapshotTasks);
            return { ok: false, summary: this.diagnose(week, attacker, window), code: 'BUMP_FAILED' };
        }

        // Temporarily apply attacker slots so candidates see the reduced space
        week.slots.push(...attackerResult.data);

        // Re-place moved tasks most important first, so they keep their relative order
        const nowIso = new Date().toISOString() as Instant;
        const byPriority = [...candidateTasks].sort((a, b) => this.priorityScore(b, nowIso) - this.priorityScore(a, nowIso));

        for (const candidate of byPriority) {
            const candResult = this.placeTask(week, candidate, window, false);
            if (!candResult.ok) {
                this.rollback(week, snapshotSlots, snapshotTasks);
                return { ok: false, summary: this.diagnose(week, attacker, window), code: 'DISPLACED_TASK_UNPLACEABLE' };
            }

            week.slots.push(...candResult.data);
            const wt = week.tasks.find(t => t.id === candidate.id);
            if (wt) wt.placement = 'placed';
        }

        const attackerSlotIds = new Set(attackerResult.data.map(s => s.id));
        week.slots = week.slots.filter(s => !attackerSlotIds.has(s.id));

        return attackerResult;
    }

    private rollback(week: WeekContainer, snapshotSlots: string, snapshotTasks: string): void {
        week.slots = JSON.parse(snapshotSlots);

        const saved: Task[] = JSON.parse(snapshotTasks);
        for (const savedTask of saved) {
            const live = week.tasks.find((t) => t.id === savedTask.id);
            if (live) Object.assign(live, savedTask);
        }
    }


    /**
     * Tier 4: place
     * Main entry point for the placement algorithm.
     */
    public place(
        week: WeekContainer,
        options: { tasks?: string[]; window: Interval; allowBump?: boolean }
    ): PlaceReport {
        const report: PlaceReport = {
            placed: [],
            unplaced: []
        };

        // Never place into the past: start the window at "now" (rounded up to the next 15 min)
        const window = this.clampWindowToNow(options.window);
        if (!window) {
            return report;
        }
        options = { ...options, window };

        // 1. Build the movable set
        let movableTasks = options.tasks
            ? week.tasks.filter(t => options.tasks!.includes(t.id))
            : week.tasks.filter(t => t.status === 'Ready');

        // 2. Remove anything frozen (InProgress, Done, or having locked slots)
        movableTasks = movableTasks.filter(t => {
            if (t.status === 'InProgress' || t.status === 'Done') return false;

            const hasLockedSlot = week.slots.some(s => s.taskIds?.includes(t.id) && s.locked);
            if (hasLockedSlot) return false;

            return true;
        });

        // 3. Split off fully sticky tasks (where remaining minutes is already 0)
        const tasksToPlace: Task[] = [];
        for (const t of movableTasks) {
            const stickySlots = week.slots.filter(s => s.taskIds?.includes(t.id));
            const needed = this.remainingMinutes(t, stickySlots);

            if (needed <= 0) {
                // Already fully placed and sticky, leave untouched.
                continue;
            }
            tasksToPlace.push(t);
        }

        if (tasksToPlace.length === 0) {
            return report;
        }

        // 4. Batch Micro Tasks
        const { batched, remaining } = this.batchMicroTasks(week, tasksToPlace, options.window);

        if (batched.length > 0) {
            week.slots.push(...batched);

            const batchedTaskIds = new Set(batched.flatMap(s => s.taskIds || []));
            batchedTaskIds.forEach(id => {
                const t = week.tasks.find(x => x.id === id);
                if (t) t.placement = 'placed';
                report.placed.push(id);
            });
        }

        // // 5. Sort remaining by deadline (ascending), then priorityScore (descending)
        const nowIso = new Date().toISOString();

        // Most important first. The deadline is already 60% of the score, and a task that
        // would miss its deadline can still move later-due tasks (see tryPreempt)
        remaining.sort((a, b) => this.priorityScore(b, nowIso as Instant) - this.priorityScore(a, nowIso as Instant));

        // 6. Attempt to place each remaining task
        for (const task of remaining) {
            const res = this.placeTask(week, task, options.window, !!options.allowBump);

            if (res.ok) {
                week.slots.push(...res.data);
                task.placement = 'placed';
                task.unplacedReason = undefined;
                report.placed.push(task.id);
            } else {
                task.placement = 'unplaced';
                task.unplacedReason = res.summary.reason;
                report.unplaced.push({ taskId: task.id, summary: res.summary });
            }
        }

        return report;
    }
}