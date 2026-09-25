import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { Task, Slot, Interval, AllocationSummary, WeekContainer, UnplacedReason, PlaceTaskResult, UnplacedTaskSummary, PlaceReport } from '../dto/scheduler.dto';
import { SCHEDULER_RULES } from './scheduler-rules.constant';
import { TimeService, Instant, LocalDate } from './time.service';


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
        // Determine the fill target percentage (default to 0.85 since buffer is 0.15)
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
        const obstacles: Interval[] = [];
        obstacles.push(...week.calendarEntries);
        obstacles.push(...week.slots);

        const resultGaps: FreeGap[] = [];

        // Process each fluid block
        for (const block of fluidBlocks) {
            let blockIntervals: Interval[] = [{ start: block.start, end: block.end }];

            // Intersect with the requested window
            blockIntervals = this.intersectMulti(blockIntervals, [window]);

            // Intersect with working hours (core hours, minus lunch, minus holidays)
            blockIntervals = this.intersectMulti(blockIntervals, workWindows);

            // Subtract all obstacles (calendar entries, sticky slots)
            blockIntervals = this.subtractMulti(blockIntervals, obstacles);

            // We now have the raw free intervals for this block
            const freeGapsForBlock = blockIntervals.map(g => ({ ...g, blockId: block.id }));

            // Apply fillTarget: Stop taking time once we hit the target capacity for this block
            const allowedCapacity = block.allocatedMinutes * fillTarget;
            const alreadyScheduledInBlock = week.slots
                .filter(s => s.blockId === block.id)
                .reduce((sum, s) => sum + this.intervalMinutes(s), 0);

            let remainingMinutesToFill = allowedCapacity - alreadyScheduledInBlock;
            if (remainingMinutesToFill <= 0) continue; // Target reached

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

    private getOverlap(a: Interval, b: Interval): Interval | null {
        const start = a.start > b.start ? a.start : b.start;
        const end = a.end < b.end ? a.end : b.end;
        if (start < end) return { start, end };
        return null;
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
        if (source.start < overlap.start) {
            results.push({ start: source.start, end: overlap.start });
        }
        // Keep part after obstacle
        if (source.end > overlap.end) {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public makeSlot(task: Task, gap: FreeGap, minutes: number, _day: LocalDate): Slot {
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
        let deadlineTerm = 0;
        if (task.deadline) {
            const nowTime = new Date(now).getTime();
            const deadlineTime = new Date(task.deadline).getTime();
            const hoursToDeadline = (deadlineTime - nowTime) / 3600000;
            deadlineTerm = 1 / Math.max(hoursToDeadline, 1);
        }
        return task.urgency + task.complexity + deadlineTerm;
    }

    public blockMinutes(placement: AllocationSummary): number {
        return Math.round((placement.allocation / 100) * SCHEDULER_RULES.CONTRACT_SOFT_CAP_MINUTES);
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
        if (this.canFit(task, gaps, neededMinutes, Infinity, true, week.timezone)) {
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
                gap, task, neededMinutes, accumulated, daysUsed, maxDays, enforceDeadline, timezone
            );
        }

        return accumulated >= neededMinutes;
    }

    private evaluateGapForFit(
        gap: FreeGap,
        task: Task,
        neededMinutes: number,
        accumulated: number,
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
        if (gapMins < SCHEDULER_RULES.MIN_BLOCK_MINUTES && gapMins < (neededMinutes - accumulated)) {
            return 0;
        }

        const day = this.timeService.localDate(workingGap.start, timezone);

        if (!daysUsed.has(day)) {
            if (daysUsed.size >= maxDays) return 0; // Exceeds day cap
            daysUsed.add(day);
        }

        return Math.min(gapMins, neededMinutes - accumulated);
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
                let gapRemainingMins = this.intervalMinutes(gap);
                let currentStartMs = new Date(gap.start).getTime();

                while (taskIdx < tasks.length && gapRemainingMins >= minBlock) {
                    let batchMins = 0;
                    const batchTaskIds: string[] = [];

                    // Keep adding tasks to this batch until we hit MIN_BLOCK or run out of gap space
                    while (taskIdx < tasks.length) {
                        const task = tasks[taskIdx];
                        if (batchMins + task.tMax <= gapRemainingMins) {
                            batchMins += task.tMax;
                            batchTaskIds.push(task.id);
                            taskIdx++;
                            if (batchMins >= minBlock) break;
                        } else {
                            break; // Task doesn't fit in this gap
                        }
                    }

                    if (batchTaskIds.length > 0) {
                        const slotDuration = Math.max(minBlock, batchMins);
                        const endMs = currentStartMs + (slotDuration * 60000);

                        newSlots.push({
                            id: crypto.randomUUID(),
                            weekId: week.id, // Successfully mapping week.id here!
                            kind: 'batch',
                            blockId: gap.blockId,
                            start: new Date(currentStartMs).toISOString() as Instant,
                            end: new Date(endMs).toISOString() as Instant,
                            taskIds: batchTaskIds,
                            locked: false,
                        });

                        currentStartMs = endMs;
                        gapRemainingMins -= slotDuration;
                    } else {
                        break;
                    }
                }
            }
        }

        // Push any tasks that couldn't fit into the week's gaps to 'unbatched'
        for (; taskIdx < tasks.length; taskIdx++) {
            unbatched.push(tasks[taskIdx]);
        }

        return { newSlots, unbatched };
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

        const gaps = this.freeGaps(week, task.projectId, window); // Fill target is default 0.85

        const plan: Slot[] = [];
        const daysUsed = new Set<string>();
        let remaining = need;

        for (const gap of gaps) {
            if (remaining <= 0) break;

            if (task.deadline) {
                const gapStartMs = new Date(gap.start).getTime();
                const deadlineMs = new Date(task.deadline).getTime();
                if (gapStartMs >= deadlineMs) break; // Gap is at or past deadline
            }

            const day = this.timeService.localDate(gap.start, week.timezone);

            if (!daysUsed.has(day)) {
                if (daysUsed.size >= SCHEDULER_RULES.FRAGMENT_MAX_COUNT) {
                    break; // Stop the whole loop: max days spanned exceeded
                }
            }

            const usable = this.clipToDeadline(gap, task.deadline as Instant);
            let take = Math.min(this.intervalMinutes(usable), remaining);
            const left = remaining - take;

            // Shrink fragment to leave a minimum block size behind for the final piece
            if (left > 0 && left < SCHEDULER_RULES.MIN_BLOCK_MINUTES) {
                take -= (SCHEDULER_RULES.MIN_BLOCK_MINUTES - left);
            }

            if (take < SCHEDULER_RULES.MIN_BLOCK_MINUTES) {
                continue; // Skip gap, too small
            }

            const slot = this.makeSlot(task, gap, take, day);
            plan.push(slot);
            daysUsed.add(day);
            remaining -= take;
        }

        if (remaining === 0) {
            return { ok: true, data: this.withDaySpanLabels(plan) };
        }

        if (remaining > 0 && allowBump) {
            const bumpResult = this.tryBump(week, task, window);
            if (bumpResult.ok) {
                return bumpResult;
            }
        }

        const summary = this.diagnose(week, task, window);
        return { ok: false, summary };
    }

    /**
     * Tier 3: tryBump
     * Displaces lower-priority, non-frozen occupants to make room for an attacking task.
     * Rolls back completely if any displaced task cannot be re-placed.
     */
    public tryBump(week: WeekContainer, attacker: Task, window: Interval): PlaceTaskResult {
        const nowIso = new Date().toISOString() as Instant;

        const candidateTasks = this.getBumpCandidates(week, attacker, window, nowIso);

        if (candidateTasks.length === 0) {
            return { ok: false, summary: this.diagnose(week, attacker, window), code: 'NO_BUMP_CANDIDATE' };
        }

        // Sort by priority ascending (bump least important first)
        candidateTasks.sort((a, b) => this.priorityScore(a, nowIso) - this.priorityScore(b, nowIso));

        return this.simulatePreemption(week, attacker, candidateTasks, window);
    }

    private getBumpCandidates(week: WeekContainer, attacker: Task, window: Interval, nowIso: Instant): Task[] {
        const windowStartMs = new Date(window.start).getTime();
        const windowEndMs = new Date(window.end).getTime();

        const occupants = week.slots.filter(s => {
            if (s.kind !== 'task') return false;
            return new Date(s.start).getTime() < windowEndMs && new Date(s.end).getTime() > windowStartMs;
        });

        const occupantTaskIds = new Set(occupants.flatMap(s => s.taskIds || []));
        const candidateTasks: Task[] = [];
        const attackerScore = this.priorityScore(attacker, nowIso);
        const attackerDeadline = attacker.deadline ? new Date(attacker.deadline).getTime() : Infinity;

        for (const taskId of occupantTaskIds) {
            const t = week.tasks.find(x => x.id === taskId);
            if (!t || t.status === 'InProgress' || t.status === 'Done') continue;

            const hasLockedSlot = week.slots.some(s => s.taskIds?.includes(t.id) && s.locked);
            if (hasLockedSlot) continue;

            const cScore = this.priorityScore(t, nowIso);
            const cDeadline = t.deadline ? new Date(t.deadline).getTime() : Infinity;

            if (cScore < attackerScore && cDeadline >= attackerDeadline) {
                candidateTasks.push(t);
            }
        }

        return candidateTasks;
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

        // Try re-placing candidates
        for (const candidate of candidateTasks) {
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
        week.tasks = JSON.parse(snapshotTasks);
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

        // 5. Sort remaining by deadline (ascending), then priorityScore (descending)
        const nowIso = new Date().toISOString();
        remaining.sort((a, b) => {
            if (a.deadline && b.deadline) {
                const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                if (diff !== 0) return diff;
            } else if (a.deadline && !b.deadline) {
                return -1; // a comes first
            } else if (!a.deadline && b.deadline) {
                return 1;  // b comes first
            }

            return this.priorityScore(b, nowIso as Instant) - this.priorityScore(a, nowIso as Instant);
        });

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