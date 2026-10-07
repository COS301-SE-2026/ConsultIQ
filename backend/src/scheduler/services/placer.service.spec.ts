import { PlacerService, FreeGap } from './placer.service';
import { TimeService, Instant } from './time.service';
import { SCHEDULER_RULES } from './scheduler-rules.constant';
import {
    Task,
    Slot,
    Interval,
    WeekContainer,
    AllocationSummary,
    PlaceTaskResult,
} from '../dto/scheduler.dto';

/*
 * Test fixtures
 * -------------
 * Week: Mon 2026-10-12 .. Fri 2026-10-16, timezone UTC.
 * Working windows (mocked TimeService): 08:00-12:00 and 13:00-17:00 each weekday
 * (unpaid lunch 12:00-13:00), i.e. 480 working minutes per day.
 * "Now" is frozen at Sunday 2026-10-11 00:00Z so the whole week is in the future.
 *
 * Expectations are derived from SCHEDULER_RULES where possible, so the spec keeps
 * working if the constants are tuned. The assumptions it relies on are asserted
 * in the first describe block, so a failure there explains any knock-on failures.
 */

const MIN = SCHEDULER_RULES.MIN_BLOCK_MINUTES;
const BUFFER = SCHEDULER_RULES.BUFFER_TARGET_PERCENTAGE;
const UMAX = SCHEDULER_RULES.URGENCY_MAX;
const CMAX = SCHEDULER_RULES.COMPLEXITY_MAX;

const WEEK_START = '2026-10-12';
const NOW = new Date('2026-10-11T00:00:00Z');

// day: 0 = Mon ... 4 = Fri, time: 'HH:MM'
const at = (day: number, time: string): Instant =>
    `2026-10-${String(12 + day).padStart(2, '0')}T${time}:00Z` as Instant;

const ms = (v: string | Date): number => new Date(v).getTime();
const minutesOf = (i: Interval): number => (ms(i.end) - ms(i.start)) / 60_000;
const totalMinutes = (xs: Interval[]): number => xs.reduce((s, i) => s + minutesOf(i), 0);
const span = (i: Interval): [number, number] => [ms(i.start), ms(i.end)];
const roundUpToMin = (m: number): number => Math.ceil(m / MIN) * MIN;
const plusMinutes = (iso: string, m: number): Instant =>
    new Date(ms(iso) + m * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z') as Instant;

const FULL_WEEK: Interval = { start: at(0, '00:00'), end: at(4, '23:59') };

// ---------- Factories ----------

let seq = 0;

function makeTimeService(): TimeService {
    return {
        workingWindows: jest.fn((weekStart: string) => {
            const base = ms(`${String(weekStart).slice(0, 10)}T00:00:00Z`);
            const windows: Interval[] = [];
            for (let d = 0; d < 5; d++) {
                const day = new Date(base + d * 86_400_000).toISOString().slice(0, 10);
                windows.push({ start: `${day}T08:00:00Z` as Instant, end: `${day}T12:00:00Z` as Instant });
                windows.push({ start: `${day}T13:00:00Z` as Instant, end: `${day}T17:00:00Z` as Instant });
            }
            return windows;
        }),
        localDate: jest.fn((instant: string) => new Date(instant).toISOString().slice(0, 10)),
    } as unknown as TimeService;
}

function makeTask(o: Record<string, unknown> = {}): Task {
    seq++;
    return {
        id: `task-${seq}`,
        weekId: 'week-1',
        projectId: 'p1',
        tMax: 60,
        urgency: 3,
        complexity: 3,
        status: 'Ready',
        placement: 'unplaced',
        deadline: undefined,
        deadlineMissAccepted: false,
        ...o,
    } as unknown as Task;
}

function makeBlock(o: Record<string, unknown> = {}) {
    seq++;
    return {
        id: `block-${seq}`,
        projectId: 'p1',
        mobility: 'fluid',
        start: at(0, '08:00'),
        end: at(0, '17:00'),
        ...o,
    };
}

function makeSlotFixture(o: Record<string, unknown> = {}): Slot {
    seq++;
    return {
        id: `slot-${seq}`,
        weekId: 'week-1',
        kind: 'task',
        blockId: 'b1',
        start: at(0, '08:00'),
        end: at(0, '09:00'),
        locked: false,
        taskIds: [],
        ...o,
    } as unknown as Slot;
}

function makeWeek(o: Record<string, unknown> = {}): WeekContainer {
    return {
        id: 'week-1',
        weekStart: WEEK_START,
        timezone: 'UTC',
        blocks: [],
        holidays: [],
        calendarEntries: [],
        slots: [],
        tasks: [],
        ...o,
    } as unknown as WeekContainer;
}

function gap(start: string, end: string, blockId = 'b1'): FreeGap {
    return { start: start as Instant, end: end as Instant, blockId } as FreeGap;
}

function expectOk(r: PlaceTaskResult): Slot[] {
    if (!r.ok) throw new Error(`Expected ok result, got ${JSON.stringify(r)}`);
    return r.data;
}

function expectFail(r: PlaceTaskResult): Extract<PlaceTaskResult, { ok: false }> {
    if (r.ok) throw new Error(`Expected failed result, got ${JSON.stringify(r)}`);
    return r;
}

const slotsFor = (slots: Slot[], taskId: string) => slots.filter(s => s.taskIds?.includes(taskId));

// ---------- Spec ----------

describe('PlacerService', () => {
    let service: PlacerService;
    let timeService: TimeService;

    beforeEach(() => {
        jest.useFakeTimers({ now: NOW });
        timeService = makeTimeService();
        service = new PlacerService(timeService);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('SCHEDULER_RULES assumptions used by this spec', () => {
        it('MIN_BLOCK_MINUTES is between 2 and 60', () => {
            expect(MIN).toBeGreaterThanOrEqual(2);
            expect(MIN).toBeLessThanOrEqual(60);
        });

        it('BUFFER_TARGET_PERCENTAGE leaves at least half of a block fillable', () => {
            expect(BUFFER).toBeGreaterThanOrEqual(0);
            expect(BUFFER).toBeLessThanOrEqual(0.5);
        });

        it('FRAGMENT_MAX_COUNT allows at least one day', () => {
            expect(SCHEDULER_RULES.FRAGMENT_MAX_COUNT).toBeGreaterThanOrEqual(1);
        });
    });

    // ---------------- Tier 0 primitives ----------------

    describe('roundUp', () => {
        it.each([
            [0, 30, 0],
            [1, 30, 30],
            [30, 30, 30],
            [31, 30, 60],
            [89, 45, 90],
        ])('roundUp(%i, %i) = %i', (minutes, unit, expected) => {
            expect(service.roundUp(minutes, unit)).toBe(expected);
        });
    });

    describe('intervalMinutes', () => {
        it('returns whole minutes between start and end', () => {
            expect(service.intervalMinutes({ start: at(0, '08:00'), end: at(0, '09:30') })).toBe(90);
        });

        it('handles mixed ISO formats', () => {
            expect(
                service.intervalMinutes({
                    start: '2026-10-12T08:00:00.000Z' as Instant,
                    end: '2026-10-12T10:00:00+02:00' as Instant,
                }),
            ).toBe(0);
        });
    });

    describe('remainingMinutes', () => {
        it('returns tMax when there are no sticky slots', () => {
            expect(service.remainingMinutes(makeTask({ tMax: 120 }))).toBe(120);
        });

        it('subtracts minutes already covered by sticky slots', () => {
            const slots = [
                makeSlotFixture({ start: at(0, '08:00'), end: at(0, '08:30') }),
                makeSlotFixture({ start: at(1, '08:00'), end: at(1, '08:30') }),
            ];
            expect(service.remainingMinutes(makeTask({ tMax: 120 }), slots)).toBe(60);
        });

        it('never goes below zero', () => {
            const slots = [makeSlotFixture({ start: at(0, '08:00'), end: at(0, '12:00') })];
            expect(service.remainingMinutes(makeTask({ tMax: 60 }), slots)).toBe(0);
        });
    });

    describe('clipToDeadline', () => {
        const g = gap(at(0, '08:00'), at(0, '12:00'));

        it('returns the gap unchanged without a deadline', () => {
            expect(service.clipToDeadline(g)).toBe(g);
        });

        it('returns the gap unchanged when it ends before the deadline', () => {
            expect(service.clipToDeadline(g, at(0, '13:00'))).toBe(g);
        });

        it('clips the end of the gap to the deadline', () => {
            expect(service.clipToDeadline(g, at(0, '10:00'))).toEqual({ ...g, end: at(0, '10:00') });
        });
    });

    describe('makeSlot', () => {
        it('builds an unlocked task slot starting at the gap start', () => {
            const task = makeTask({ id: 't1', weekId: 'week-9' });
            const slot = service.makeSlot(task, gap(at(0, '08:00'), at(0, '12:00'), 'b7'), 90);

            expect(slot).toMatchObject({
                weekId: 'week-9',
                kind: 'task',
                blockId: 'b7',
                start: at(0, '08:00'),
                end: at(0, '09:30'),
                locked: false,
                daySpan: 0,
                taskIds: ['t1'],
                subtaskIds: [],
            });
            expect(typeof slot.id).toBe('string');
            expect(slot.id.length).toBeGreaterThan(0);
        });

        it('generates unique ids', () => {
            const task = makeTask();
            const g = gap(at(0, '08:00'), at(0, '12:00'));
            expect(service.makeSlot(task, g, 30).id).not.toBe(service.makeSlot(task, g, 30).id);
        });
    });

    describe('withDaySpanLabels', () => {
        it('numbers each task\'s slots chronologically and ignores batch slots', () => {
            const aLate = makeSlotFixture({ taskIds: ['A'], start: at(1, '08:00'), end: at(1, '09:00') });
            const aEarly = makeSlotFixture({ taskIds: ['A'], start: at(0, '08:00'), end: at(0, '09:00') });
            const b = makeSlotFixture({ taskIds: ['B'], start: at(2, '08:00'), end: at(2, '09:00') });
            const batch = makeSlotFixture({ kind: 'batch', taskIds: ['C', 'D'] });

            const result = service.withDaySpanLabels([aLate, aEarly, b, batch]);

            expect(result).toHaveLength(4);
            expect(aEarly.daySpan).toBe(1);
            expect(aLate.daySpan).toBe(2);
            expect(b.daySpan).toBe(1);
            expect(batch.daySpan).toBeUndefined();
        });
    });

    describe('priorityScore', () => {
        const now = NOW.toISOString() as Instant;
        const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

        it('weights urgency and complexity when there is no deadline', () => {
            expect(service.priorityScore(makeTask({ urgency: UMAX, complexity: CMAX }), now)).toBeCloseTo(0.4);
            expect(service.priorityScore(makeTask({ urgency: UMAX, complexity: 0 }), now)).toBeCloseTo(0.25);
            expect(service.priorityScore(makeTask({ urgency: 0, complexity: CMAX }), now)).toBeCloseTo(0.15);
            expect(service.priorityScore(makeTask({ urgency: 0, complexity: 0 }), now)).toBeCloseTo(0);
        });

        it.each([
            [0.5, 1],
            [5, 0.9],
            [20, 0.75],
            [48, 0.5],
            [100, 0.25],
            [200, 0.1],
        ])('a deadline %i hours away scores %f on the deadline component', (hours, deadlineScore) => {
            const task = makeTask({ urgency: 0, complexity: 0, deadline: hoursFromNow(hours) });
            expect(service.priorityScore(task, now)).toBeCloseTo(deadlineScore * 0.6);
        });

        it('ranks a closer deadline higher', () => {
            const soon = makeTask({ deadline: hoursFromNow(2) });
            const later = makeTask({ deadline: hoursFromNow(150) });
            expect(service.priorityScore(soon, now)).toBeGreaterThan(service.priorityScore(later, now));
        });
    });

    describe('blockMinutes', () => {
        const daily = SCHEDULER_RULES.CONTRACT_SOFT_CAP_MINUTES / SCHEDULER_RULES.WORKING_DAYS_PER_WEEK;

        it.each([100, 50, 25])('converts %i%% allocation to daily minutes', allocation => {
            const placement = { allocation } as unknown as AllocationSummary;
            expect(service.blockMinutes(placement)).toBe(Math.round((allocation / 100) * daily));
        });
    });

    // ---------------- Tier 1: freeGaps ----------------

    describe('freeGaps', () => {
        it('returns no gaps when the project has no fluid blocks', () => {
            const week = makeWeek({
                blocks: [
                    makeBlock({ id: 'other', projectId: 'p2' }),
                    makeBlock({ id: 'fixed', projectId: 'p1', mobility: 'fixed' }),
                ],
            });
            expect(service.freeGaps(week, 'p1', FULL_WEEK, { fillTarget: 1 })).toEqual([]);
        });

        it('splits a block around the unpaid lunch break', () => {
            const week = makeWeek({ blocks: [makeBlock({ id: 'b1' })] });

            const gaps = service.freeGaps(week, 'p1', FULL_WEEK, { fillTarget: 1 });

            expect(gaps.map(span)).toEqual([
                [ms(at(0, '08:00')), ms(at(0, '12:00'))],
                [ms(at(0, '13:00')), ms(at(0, '17:00'))],
            ]);
            expect(gaps.every(g => g.blockId === 'b1')).toBe(true);
        });

        it('excludes public holidays', () => {
            const week = makeWeek({
                blocks: [makeBlock({ id: 'b1', start: at(0, '08:00'), end: at(1, '17:00') })],
                holidays: [{ date: '2026-10-12' }],
            });

            const gaps = service.freeGaps(week, 'p1', FULL_WEEK, { fillTarget: 1 });

            expect(totalMinutes(gaps)).toBe(480);
            expect(gaps.every(g => String(g.start).startsWith('2026-10-13'))).toBe(true);
        });

        it('carves out calendar entries', () => {
            const week = makeWeek({
                blocks: [makeBlock({ id: 'b1' })],
                calendarEntries: [{ start: at(0, '09:00'), end: at(0, '10:00') }],
            });

            const gaps = service.freeGaps(week, 'p1', FULL_WEEK, { fillTarget: 1 });

            expect(gaps.map(span)).toEqual([
                [ms(at(0, '08:00')), ms(at(0, '09:00'))],
                [ms(at(0, '10:00')), ms(at(0, '12:00'))],
                [ms(at(0, '13:00')), ms(at(0, '17:00'))],
            ]);
        });

        it('carves out existing slots and counts them against capacity', () => {
            const week = makeWeek({
                blocks: [makeBlock({ id: 'b1' })],
                slots: [makeSlotFixture({ blockId: 'b1', start: at(0, '13:00'), end: at(0, '14:00') })],
            });

            const gaps = service.freeGaps(week, 'p1', FULL_WEEK, { fillTarget: 1 });

            expect(gaps.map(span)).toEqual([
                [ms(at(0, '08:00')), ms(at(0, '12:00'))],
                [ms(at(0, '14:00')), ms(at(0, '17:00'))],
            ]);
            expect(totalMinutes(gaps)).toBe(420);
        });

        it('returns nothing once a block has reached its fill target', () => {
            const week = makeWeek({
                blocks: [makeBlock({ id: 'b1' })],
                slots: [
                    makeSlotFixture({ blockId: 'b1', start: at(0, '08:00'), end: at(0, '12:00') }),
                    makeSlotFixture({ blockId: 'b1', start: at(0, '13:00'), end: at(0, '17:00') }),
                ],
            });

            expect(service.freeGaps(week, 'p1', FULL_WEEK, { fillTarget: 1 })).toEqual([]);
        });

        it('trims gaps to the fill target', () => {
            const week = makeWeek({ blocks: [makeBlock({ id: 'b1' })] });

            // 480 working minutes * 0.25 = 120 allowed
            const gaps = service.freeGaps(week, 'p1', FULL_WEEK, { fillTarget: 0.25 });

            expect(gaps).toHaveLength(1);
            expect(gaps[0].start).toBe(at(0, '08:00'));
            expect(gaps[0].end).toBe(at(0, '10:00'));
        });

        it('defaults the fill target to 1 - BUFFER_TARGET_PERCENTAGE', () => {
            const week = makeWeek({ blocks: [makeBlock({ id: 'b1' })] });

            const gaps = service.freeGaps(week, 'p1', FULL_WEEK);

            expect(totalMinutes(gaps)).toBe(Math.min(480, Math.floor(480 * (1 - BUFFER))));
        });

        it('only returns time inside the requested window', () => {
            const week = makeWeek({ blocks: [makeBlock({ id: 'b1' })] });

            const gaps = service.freeGaps(
                week, 'p1', { start: at(0, '13:00'), end: at(0, '17:00') }, { fillTarget: 1 },
            );

            expect(gaps.map(span)).toEqual([[ms(at(0, '13:00')), ms(at(0, '17:00'))]]);
        });

        it('sorts gaps chronologically across blocks', () => {
            const week = makeWeek({
                blocks: [
                    makeBlock({ id: 'tue', start: at(1, '08:00'), end: at(1, '12:00') }),
                    makeBlock({ id: 'mon', start: at(0, '08:00'), end: at(0, '12:00') }),
                ],
            });

            const gaps = service.freeGaps(week, 'p1', FULL_WEEK, { fillTarget: 1 });

            expect(gaps.map(g => g.blockId)).toEqual(['mon', 'tue']);
        });
    });

    // ---------------- canFit ----------------

    describe('canFit', () => {
        const task = makeTask();

        it('is true when nothing is needed', () => {
            expect(service.canFit(task, [], 0, Infinity, true, 'UTC')).toBe(true);
        });

        it('accumulates minutes across gaps', () => {
            const gaps = [gap(at(0, '08:00'), at(0, '09:00')), gap(at(1, '08:00'), at(1, '09:00'))];
            expect(service.canFit(task, gaps, 120, Infinity, true, 'UTC')).toBe(true);
            expect(service.canFit(task, gaps, 180, Infinity, true, 'UTC')).toBe(false);
        });

        it('respects the day cap', () => {
            const gaps = [gap(at(0, '08:00'), at(0, '09:00')), gap(at(1, '08:00'), at(1, '09:00'))];
            expect(service.canFit(task, gaps, 120, 1, true, 'UTC')).toBe(false);
            expect(service.canFit(task, gaps, 120, 2, true, 'UTC')).toBe(true);
        });

        it('clips gaps to the deadline only when enforcing it', () => {
            const withDeadline = makeTask({ deadline: at(0, '09:00') });
            const gaps = [gap(at(0, '08:00'), at(0, '12:00'))];

            expect(service.canFit(withDeadline, gaps, 120, Infinity, true, 'UTC')).toBe(false);
            expect(service.canFit(withDeadline, gaps, 120, Infinity, false, 'UTC')).toBe(true);
        });

        it('skips gaps smaller than MIN_BLOCK_MINUTES unless they finish the task', () => {
            const small = Math.floor(MIN / 2);
            const gaps = [gap(at(0, '08:00'), plusMinutes(at(0, '08:00'), small))];

            expect(service.canFit(task, gaps, MIN, Infinity, true, 'UTC')).toBe(false);
            expect(service.canFit(task, gaps, small, Infinity, true, 'UTC')).toBe(true);
        });
    });

    // ---------------- Tier 2: diagnose ----------------

    describe('diagnose', () => {
        it('reports CONTAINER_FULL when there is not enough space at all', () => {
            const task = makeTask({ tMax: 600 });
            const week = makeWeek({
                blocks: [makeBlock({ id: 'b1', start: at(0, '08:00'), end: at(0, '09:00') })],
                tasks: [task],
            });

            const summary = service.diagnose(week, task, FULL_WEEK);

            expect(summary.reason).toBe('CONTAINER_FULL');
            expect(summary.neededMinutes).toBe(600);
            expect(summary.availableMinutes).toBe(totalMinutes(service.freeGaps(week, 'p1', FULL_WEEK)));
        });

        it('reports DAY_SPAN_LIMIT when the task fits once the day cap is ignored', () => {
            const task = makeTask({ tMax: 60 });
            const week = makeWeek({ blocks: [makeBlock({ id: 'b1' })], tasks: [task] });

            expect(service.diagnose(week, task, FULL_WEEK).reason).toBe('DAY_SPAN_LIMIT');
        });

        it('reports DEADLINE_INFEASIBLE when it only fits after the deadline', () => {
            const task = makeTask({ tMax: 120, deadline: at(0, '08:30') });
            const week = makeWeek({ blocks: [makeBlock({ id: 'b1' })], tasks: [task] });

            const summary = service.diagnose(week, task, FULL_WEEK);

            expect(summary.reason).toBe('DEADLINE_INFEASIBLE');
            expect(summary.deadline).toBe(at(0, '08:30'));
        });

        it('ignores the deadline when a miss has been accepted', () => {
            const task = makeTask({ tMax: 120, deadline: at(0, '08:30'), deadlineMissAccepted: true });
            const week = makeWeek({ blocks: [makeBlock({ id: 'b1' })], tasks: [task] });

            expect(service.diagnose(week, task, FULL_WEEK).reason).toBe('DAY_SPAN_LIMIT');
        });

        it('subtracts sticky slots from the needed minutes', () => {
            const task = makeTask({ id: 'sticky', tMax: 120 });
            const week = makeWeek({
                blocks: [makeBlock({ id: 'b1' })],
                tasks: [task],
                slots: [makeSlotFixture({ taskIds: ['sticky'], start: at(0, '08:00'), end: at(0, '08:30') })],
            });

            expect(service.diagnose(week, task, FULL_WEEK).neededMinutes).toBe(90);
        });
    });

    // ---------------- Tier 2: batchMicroTasks ----------------

    describe('batchMicroTasks', () => {
        const mondayWeek = (o: Record<string, unknown> = {}) =>
            makeWeek({ blocks: [makeBlock({ id: 'b1' })], ...o });

        it('leaves tasks of at least MIN_BLOCK_MINUTES for normal placement', () => {
            const big = makeTask({ tMax: MIN });

            const { batched, remaining } = service.batchMicroTasks(mondayWeek(), [big], FULL_WEEK);

            expect(batched).toEqual([]);
            expect(remaining).toEqual([big]);
        });

        it('rounds a single micro task up to a full minimum block', () => {
            const micro = makeTask({ tMax: MIN - 1 });

            const { batched, remaining } = service.batchMicroTasks(mondayWeek(), [micro], FULL_WEEK);

            expect(remaining).toEqual([]);
            expect(batched).toHaveLength(1);
            expect(batched[0]).toMatchObject({
                kind: 'batch',
                blockId: 'b1',
                weekId: 'week-1',
                taskIds: [micro.id],
                locked: false,
            });
            expect(ms(batched[0].start)).toBe(ms(at(0, '08:00')));
            expect(minutesOf(batched[0])).toBe(MIN);
        });

        it('groups several micro tasks into one batch slot', () => {
            const a = makeTask({ tMax: MIN - 1 });
            const b = makeTask({ tMax: MIN - 1 });

            const { batched } = service.batchMicroTasks(mondayWeek(), [a, b], FULL_WEEK);

            expect(batched).toHaveLength(1);
            expect(batched[0].taskIds).toEqual(expect.arrayContaining([a.id, b.id]));
            expect(minutesOf(batched[0])).toBe(Math.max(MIN, 2 * (MIN - 1)));
        });

        it('puts tasks with a deadline first', () => {
            const noDeadline = makeTask({ tMax: MIN - 1, urgency: UMAX, complexity: CMAX });
            const withDeadline = makeTask({ tMax: MIN - 1, urgency: 1, complexity: 1, deadline: at(4, '17:00') });

            const { batched } = service.batchMicroTasks(mondayWeek(), [noDeadline, withDeadline], FULL_WEEK);

            expect(batched[0].taskIds?.[0]).toBe(withDeadline.id);
        });

        it('batches per project into that project\'s blocks', () => {
            const week = makeWeek({
                blocks: [
                    makeBlock({ id: 'b-p1', projectId: 'p1' }),
                    makeBlock({ id: 'b-p2', projectId: 'p2', start: at(1, '08:00'), end: at(1, '17:00') }),
                ],
            });
            const t1 = makeTask({ projectId: 'p1', tMax: MIN - 1 });
            const t2 = makeTask({ projectId: 'p2', tMax: MIN - 1 });

            const { batched } = service.batchMicroTasks(week, [t1, t2], FULL_WEEK);

            expect(batched).toHaveLength(2);
            expect(batched.find(s => s.taskIds?.includes(t1.id))?.blockId).toBe('b-p1');
            expect(batched.find(s => s.taskIds?.includes(t2.id))?.blockId).toBe('b-p2');
        });

        it('returns micro tasks it cannot fit as remaining', () => {
            const orphan = makeTask({ projectId: 'no-blocks', tMax: MIN - 1 });

            const { batched, remaining } = service.batchMicroTasks(mondayWeek(), [orphan], FULL_WEEK);

            expect(batched).toEqual([]);
            expect(remaining).toEqual([orphan]);
        });
    });

    // ---------------- Tier 3: placeTask ----------------

    describe('placeTask', () => {
        const wholeWeekBlock = () => makeBlock({ id: 'b1', start: at(0, '08:00'), end: at(4, '17:00') });

        it('places a task into the first free gap', () => {
            const task = makeTask({ tMax: 60 });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [task] });

            const slots = expectOk(service.placeTask(week, task, FULL_WEEK, false));

            expect(slots).toHaveLength(1);
            expect(slots[0]).toMatchObject({ kind: 'task', blockId: 'b1', taskIds: [task.id], locked: false, daySpan: 1 });
            expect(ms(slots[0].start)).toBe(ms(at(0, '08:00')));
            expect(minutesOf(slots[0])).toBe(roundUpToMin(60));
        });

        it('rounds the needed time up to MIN_BLOCK_MINUTES', () => {
            const task = makeTask({ tMax: MIN + 1 });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [task] });

            const slots = expectOk(service.placeTask(week, task, FULL_WEEK, false));

            expect(totalMinutes(slots)).toBe(2 * MIN);
        });

        it('fragments a long task across gaps and labels the fragments', () => {
            const task = makeTask({ tMax: 300 });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [task] });

            const slots = expectOk(service.placeTask(week, task, FULL_WEEK, false));

            expect(slots.length).toBeGreaterThan(1);
            expect(totalMinutes(slots)).toBe(roundUpToMin(300));
            expect(slots.map(s => s.daySpan)).toEqual(slots.map((_, i) => i + 1));
            slots.forEach(s => expect(minutesOf(s)).toBeGreaterThanOrEqual(MIN));
        });

        it('only places the time not already covered by sticky slots', () => {
            const task = makeTask({ id: 'sticky', tMax: 120 });
            const week = makeWeek({
                blocks: [wholeWeekBlock()],
                tasks: [task],
                slots: [makeSlotFixture({ blockId: 'b1', taskIds: ['sticky'], start: at(0, '08:00'), end: at(0, '09:00') })],
            });

            const slots = expectOk(service.placeTask(week, task, FULL_WEEK, false));

            expect(totalMinutes(slots)).toBe(roundUpToMin(60));
            slots.forEach(s => expect(ms(s.start)).toBeGreaterThanOrEqual(ms(at(0, '09:00'))));
        });

        it('returns CONTAINER_FULL when the task cannot fit', () => {
            const task = makeTask({ tMax: 600 });
            const week = makeWeek({
                blocks: [makeBlock({ id: 'b1', start: at(0, '08:00'), end: at(0, '09:00') })],
                tasks: [task],
            });

            const result = expectFail(service.placeTask(week, task, FULL_WEEK, false));

            expect(result.summary.reason).toBe('CONTAINER_FULL');
        });

        it('returns DEADLINE_INFEASIBLE when there is not enough time before the deadline', () => {
            const task = makeTask({ tMax: 120, deadline: at(0, '08:30') });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [task] });

            const result = expectFail(service.placeTask(week, task, FULL_WEEK, false));

            expect(result.summary.reason).toBe('DEADLINE_INFEASIBLE');
        });

        it('places past the deadline when a miss has been accepted', () => {
            const task = makeTask({ tMax: 120, deadline: at(0, '08:30'), deadlineMissAccepted: true });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [task] });

            const slots = expectOk(service.placeTask(week, task, FULL_WEEK, false));

            expect(totalMinutes(slots)).toBe(roundUpToMin(120));
        });

        it('returns an empty plan when sticky slots already cover the task', () => {
            const task = makeTask({ id: 'covered', tMax: 60 });
            const week = makeWeek({
                blocks: [wholeWeekBlock()],
                tasks: [task],
                slots: [makeSlotFixture({ blockId: 'b1', taskIds: ['covered'], start: at(0, '08:00'), end: at(0, '09:00') })],
            });

            expect(expectOk(service.placeTask(week, task, FULL_WEEK, true))).toEqual([]);
        });

        it('never tries to preempt when allowBump is false', () => {
            const task = makeTask({ tMax: 600 });
            const week = makeWeek({
                blocks: [makeBlock({ id: 'b1', start: at(0, '08:00'), end: at(0, '09:00') })],
                tasks: [task],
            });
            const preemptSpy = jest.spyOn(service, 'tryPreempt');

            service.placeTask(week, task, FULL_WEEK, false);

            expect(preemptSpy).not.toHaveBeenCalled();
        });

        it('asks tryPreempt to make room when the task does not fit', () => {
            const task = makeTask({ tMax: 600 });
            const week = makeWeek({
                blocks: [makeBlock({ id: 'b1', start: at(0, '08:00'), end: at(0, '09:00') })],
                tasks: [task],
            });
            const preemptSpy = jest.spyOn(service, 'tryPreempt');

            service.placeTask(week, task, FULL_WEEK, true);

            expect(preemptSpy).toHaveBeenCalledWith(week, task, FULL_WEEK, null);
        });

        it('offers its free plan to tryPreempt when the task fits', () => {
            const task = makeTask({ tMax: 60 });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [task] });
            const preemptSpy = jest.spyOn(service, 'tryPreempt');

            service.placeTask(week, task, FULL_WEEK, true);

            expect(preemptSpy).toHaveBeenCalledWith(week, task, FULL_WEEK, expect.any(Array));
        });

        it('falls back to the free plan when nothing can be preempted', () => {
            const task = makeTask({ tMax: 60 });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [task] });

            const slots = expectOk(service.placeTask(week, task, FULL_WEEK, true));

            expect(slots).toHaveLength(1);
            expect(ms(slots[0].start)).toBe(ms(at(0, '08:00')));
        });

        it('returns the preempted plan when tryPreempt succeeds', () => {
            const task = makeTask({ tMax: 60 });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [task] });
            const preempted = [makeSlotFixture({ taskIds: [task.id] })];
            jest.spyOn(service, 'tryPreempt').mockReturnValue({ ok: true, data: preempted } as PlaceTaskResult);

            expect(expectOk(service.placeTask(week, task, FULL_WEEK, true))).toBe(preempted);
        });

        it('still reports the failure when preemption fails', () => {
            const task = makeTask({ tMax: 600 });
            const week = makeWeek({
                blocks: [makeBlock({ id: 'b1', start: at(0, '08:00'), end: at(0, '09:00') })],
                tasks: [task],
            });

            const result = expectFail(service.placeTask(week, task, FULL_WEEK, true));

            expect(result.summary.reason).toBe('CONTAINER_FULL');
        });
    });

    // ---------------- Tier 3: tryPreempt ----------------

    describe('tryPreempt', () => {
        // Buffer off so block capacities are exact and these scenarios don't depend on the configured buffer
        beforeEach(() => {
            jest.replaceProperty(
                SCHEDULER_RULES as unknown as Record<string, number>,
                'BUFFER_TARGET_PERCENTAGE',
                0,
            );
        });

        const important = { urgency: UMAX, complexity: CMAX };
        const unimportant = { urgency: 0, complexity: 0 };

        type Overrides = Record<string, unknown>;

        describe('when the attacker does not fit (freePlan = null)', () => {
            /*
             * p1 has a 1-hour Monday block fully used by `victim`, plus (optionally) a Tuesday block.
             * The attacker is due Monday noon, so it can only use the Monday block.
             */
            function noRoomScenario(o: { attacker?: Overrides; victim?: Overrides; withTuesday?: boolean } = {}) {
                const attacker = makeTask({ id: 'attacker', tMax: 60, deadline: at(0, '12:00'), ...important, ...o.attacker });
                const victim = makeTask({ id: 'victim', tMax: 60, placement: 'placed', ...unimportant, ...o.victim });
                const blocks = [makeBlock({ id: 'b-mon', start: at(0, '08:00'), end: at(0, '09:00') })];
                if (o.withTuesday !== false) {
                    blocks.push(makeBlock({ id: 'b-tue', start: at(1, '08:00'), end: at(1, '17:00') }));
                }
                const week = makeWeek({
                    blocks,
                    tasks: [attacker, victim],
                    slots: [makeSlotFixture({
                        id: 'victim-slot', blockId: 'b-mon', taskIds: ['victim'],
                        start: at(0, '08:00'), end: at(0, '09:00'),
                    })],
                });
                return { week, attacker, victim };
            }

            it('moves a less important task out of the way and re-places it', () => {
                const { week, attacker, victim } = noRoomScenario();
                expectFail(service.placeTask(week, attacker, FULL_WEEK, false)); // sanity: no free room

                const slots = expectOk(service.tryPreempt(week, attacker, FULL_WEEK, null));

                expect(slots).toHaveLength(1);
                expect(slots[0].taskIds).toEqual(['attacker']);
                expect(ms(slots[0].start)).toBe(ms(at(0, '08:00')));

                // The attacker's slots are returned, not written to the week (the caller does that)
                expect(slotsFor(week.slots, 'attacker')).toEqual([]);

                expect(week.slots.find(s => s.id === 'victim-slot')).toBeUndefined();
                const victimSlots = slotsFor(week.slots, 'victim');
                expect(totalMinutes(victimSlots)).toBe(roundUpToMin(60));
                expect(ms(victimSlots[0].start)).toBe(ms(at(1, '08:00')));
                expect(victim.placement).toBe('placed');
            });

            it('moves a more important task that is due later (deadline rescue)', () => {
                const { week, attacker } = noRoomScenario({
                    attacker: unimportant,
                    victim: { ...important, deadline: at(4, '17:00') },
                });
                const now = NOW.toISOString() as Instant;
                const victimTask = week.tasks.find(t => t.id === 'victim')!;
                expect(service.priorityScore(victimTask, now)).toBeGreaterThan(service.priorityScore(attacker, now));

                const slots = expectOk(service.tryPreempt(week, attacker, FULL_WEEK, null));

                expect(ms(slots[0].start)).toBe(ms(at(0, '08:00')));
                const victimSlots = slotsFor(week.slots, 'victim');
                expect(totalMinutes(victimSlots)).toBe(roundUpToMin(60));
                victimSlots.forEach(s => expect(ms(s.end)).toBeLessThanOrEqual(ms(at(4, '17:00'))));
            });

            it('does not move a more important task that is due sooner', () => {
                const { week, attacker } = noRoomScenario({
                    attacker: unimportant,
                    victim: { ...important, deadline: at(0, '10:00') },
                });

                const result = expectFail(service.tryPreempt(week, attacker, FULL_WEEK, null));

                expect(result.code).toBe('NO_BUMP_CANDIDATE');
            });

            it('moves as few tasks as possible, least important first', () => {
                const attacker = makeTask({ id: 'attacker', tMax: 60, deadline: at(0, '12:00'), ...important });
                const v1 = makeTask({ id: 'v1', tMax: 60, ...unimportant });
                const v2 = makeTask({ id: 'v2', tMax: 60, urgency: 1, complexity: 0 });
                const week = makeWeek({
                    blocks: [
                        makeBlock({ id: 'b-mon', start: at(0, '08:00'), end: at(0, '10:00') }),
                        makeBlock({ id: 'b-tue', start: at(1, '08:00'), end: at(1, '17:00') }),
                    ],
                    tasks: [attacker, v1, v2],
                    slots: [
                        makeSlotFixture({ id: 'v1-slot', blockId: 'b-mon', taskIds: ['v1'], start: at(0, '08:00'), end: at(0, '09:00') }),
                        makeSlotFixture({ id: 'v2-slot', blockId: 'b-mon', taskIds: ['v2'], start: at(0, '09:00'), end: at(0, '10:00') }),
                    ],
                });

                const slots = expectOk(service.tryPreempt(week, attacker, FULL_WEEK, null));

                expect(ms(slots[0].start)).toBe(ms(at(0, '08:00')));
                expect(week.slots.find(s => s.id === 'v2-slot')).toBeDefined(); // untouched
                expect(week.slots.find(s => s.id === 'v1-slot')).toBeUndefined();
                expect(ms(slotsFor(week.slots, 'v1')[0].start)).toBe(ms(at(1, '08:00')));
            });

            it('rolls back and reports BUMP_FAILED when a moved task cannot be re-placed', () => {
                const { week, attacker, victim } = noRoomScenario({ withTuesday: false });
                const slotsBefore = JSON.parse(JSON.stringify(week.slots));

                const result = expectFail(service.tryPreempt(week, attacker, FULL_WEEK, null));

                expect(result.code).toBe('BUMP_FAILED');
                expect(week.slots).toEqual(slotsBefore);
                // Rollback restores the live task objects rather than replacing them
                expect(week.tasks.find(t => t.id === 'victim')).toBe(victim);
                expect(victim.placement).toBe('placed');
            });
        });

        describe('when the attacker fits (freePlan given)', () => {
            const wholeWeekBlock = () => makeBlock({ id: 'b1', start: at(0, '08:00'), end: at(4, '17:00') });

            /*
             * A less important `victim` sits at Mon 08-10. Without moving anything the
             * attacker would land at Mon 10-11 (the free plan), so the victim is "in front".
             */
            function inFrontScenario(o: { victim?: Overrides; victimSlot?: Overrides } = {}) {
                const attacker = makeTask({ id: 'attacker', tMax: 60, ...important });
                const victim = makeTask({ id: 'victim', tMax: 120, placement: 'placed', ...unimportant, ...o.victim });
                const week = makeWeek({
                    blocks: [wholeWeekBlock()],
                    tasks: [attacker, victim],
                    slots: [makeSlotFixture({
                        id: 'victim-slot', blockId: 'b1', taskIds: ['victim'],
                        start: at(0, '08:00'), end: at(0, '10:00'),
                        ...o.victimSlot,
                    })],
                });
                const freePlan = [makeSlotFixture({ blockId: 'b1', taskIds: ['attacker'], start: at(0, '10:00'), end: at(0, '11:00') })];
                return { week, attacker, victim, freePlan };
            }

            it('lets the attacker go ahead of less important work in front of it', () => {
                const { week, attacker, freePlan } = inFrontScenario();

                const slots = expectOk(service.tryPreempt(week, attacker, FULL_WEEK, freePlan));

                expect(ms(slots[0].start)).toBe(ms(at(0, '08:00')));
                expect(week.slots.find(s => s.id === 'victim-slot')).toBeUndefined();
                const victimSlots = slotsFor(week.slots, 'victim');
                expect(totalMinutes(victimSlots)).toBe(roundUpToMin(120));
                victimSlots.forEach(s => expect(ms(s.start)).toBeGreaterThanOrEqual(ms(slots[0].end)));
            });

            it('works end to end through placeTask(allowBump = true)', () => {
                const { week, attacker } = inFrontScenario();

                const slots = expectOk(service.placeTask(week, attacker, FULL_WEEK, true));

                expect(ms(slots[0].start)).toBe(ms(at(0, '08:00')));
            });

            it('re-places moved tasks most important first', () => {
                const attacker = makeTask({ id: 'attacker', tMax: 60, ...important });
                const low = makeTask({ id: 'low', tMax: 60, ...unimportant });
                const mid = makeTask({ id: 'mid', tMax: 60, urgency: 2, complexity: 0 });
                const week = makeWeek({
                    blocks: [wholeWeekBlock()],
                    tasks: [attacker, low, mid],
                    slots: [
                        makeSlotFixture({ blockId: 'b1', taskIds: ['low'], start: at(0, '08:00'), end: at(0, '09:00') }),
                        makeSlotFixture({ blockId: 'b1', taskIds: ['mid'], start: at(0, '09:00'), end: at(0, '10:00') }),
                    ],
                });
                const freePlan = [makeSlotFixture({ blockId: 'b1', taskIds: ['attacker'], start: at(0, '10:00'), end: at(0, '11:00') })];

                expectOk(service.tryPreempt(week, attacker, FULL_WEEK, freePlan));

                const midStart = ms(slotsFor(week.slots, 'mid')[0].start);
                const lowStart = ms(slotsFor(week.slots, 'low')[0].start);
                expect(midStart).toBeLessThan(lowStart);
            });

            it('leaves tasks behind the attacker\'s free slot alone', () => {
                const { week, attacker, freePlan } = inFrontScenario({
                    victimSlot: { start: at(0, '13:00'), end: at(0, '15:00') },
                });
                const slotsBefore = JSON.parse(JSON.stringify(week.slots));

                const result = expectFail(service.tryPreempt(week, attacker, FULL_WEEK, freePlan));

                expect(result.code).toBe('NO_BUMP_CANDIDATE');
                expect(week.slots).toEqual(slotsBefore);
            });

            const exclusions: Array<[string, { victim?: Overrides; victimSlot?: Overrides }]> = [
                ['belongs to another project', { victim: { projectId: 'p2' } }],
                ['is InProgress', { victim: { status: 'InProgress' } }],
                ['is Done', { victim: { status: 'Done' } }],
                ['has a locked slot', { victimSlot: { locked: true } }],
                ['is in a batch slot', { victimSlot: { kind: 'batch' } }],
                ['is just as important', { victim: important }],
                ['is more important but due later (no rescue when the attacker fits)', {
                    victim: { ...important, deadline: at(4, '17:00') },
                }],
            ];

            it.each(exclusions)('does not move a task that %s', (_label, overrides) => {
                const { week, attacker, freePlan } = inFrontScenario(overrides);

                const result = expectFail(service.tryPreempt(week, attacker, FULL_WEEK, freePlan));

                expect(result.code).toBe('NO_BUMP_CANDIDATE');
            });

            it('does not move a task with time before the window start', () => {
                const { week, attacker, freePlan } = inFrontScenario();

                const result = expectFail(
                    service.tryPreempt(week, attacker, { start: at(0, '09:00'), end: FULL_WEEK.end }, freePlan),
                );

                expect(result.code).toBe('NO_BUMP_CANDIDATE');
            });

            it('does not move a task that has no slots', () => {
                const { week, attacker, freePlan } = inFrontScenario();
                week.slots = [];

                const result = expectFail(service.tryPreempt(week, attacker, FULL_WEEK, freePlan));

                expect(result.code).toBe('NO_BUMP_CANDIDATE');
            });
        });
    });

    // ---------------- Tier 4: place ----------------

    describe('place', () => {
        const wholeWeekBlock = () => makeBlock({ id: 'b1', start: at(0, '08:00'), end: at(4, '17:00') });

        it('returns an empty report when the window is entirely in the past', () => {
            const task = makeTask();
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [task] });

            const report = service.place(week, {
                window: { start: '2026-10-09T08:00:00Z' as Instant, end: '2026-10-09T17:00:00Z' as Instant },
            });

            expect(report).toEqual({ placed: [], unplaced: [] });
            expect(week.slots).toEqual([]);
        });

        it('never places before now, rounded up to the next quarter hour', () => {
            jest.setSystemTime(new Date('2026-10-12T08:07:00Z'));
            const task = makeTask({ tMax: 60 });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [task] });

            service.place(week, { window: FULL_WEEK });

            const slots = slotsFor(week.slots, task.id);
            expect(slots).toHaveLength(1);
            expect(ms(slots[0].start)).toBe(ms(at(0, '08:15')));
        });

        it('places Ready tasks and records them in the report', () => {
            const a = makeTask({ tMax: 60 });
            const b = makeTask({ tMax: 90 });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [a, b] });

            const report = service.place(week, { window: FULL_WEEK });

            expect(report.placed).toEqual(expect.arrayContaining([a.id, b.id]));
            expect(report.unplaced).toEqual([]);
            expect(a.placement).toBe('placed');
            expect(a.unplacedReason).toBeUndefined();
            expect(totalMinutes(slotsFor(week.slots, a.id))).toBe(roundUpToMin(60));
            expect(totalMinutes(slotsFor(week.slots, b.id))).toBe(roundUpToMin(90));
        });

        it('ignores tasks that are not Ready when no task list is given', () => {
            const blocked = makeTask({ status: 'Blocked' });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [blocked] });

            const report = service.place(week, { window: FULL_WEEK });

            expect(report).toEqual({ placed: [], unplaced: [] });
        });

        it('only places the listed tasks when a task list is given', () => {
            const a = makeTask();
            const b = makeTask();
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [a, b] });

            const report = service.place(week, { tasks: [a.id], window: FULL_WEEK });

            expect(report.placed).toEqual([a.id]);
            expect(slotsFor(week.slots, b.id)).toEqual([]);
        });

        it('never moves frozen tasks, even when listed', () => {
            const inProgress = makeTask({ status: 'InProgress' });
            const done = makeTask({ status: 'Done' });
            const locked = makeTask({ id: 'locked', tMax: 120 });
            const week = makeWeek({
                blocks: [wholeWeekBlock()],
                tasks: [inProgress, done, locked],
                slots: [makeSlotFixture({ taskIds: ['locked'], locked: true, start: at(0, '08:00'), end: at(0, '09:00') })],
            });

            const report = service.place(week, { tasks: [inProgress.id, done.id, locked.id], window: FULL_WEEK });

            expect(report).toEqual({ placed: [], unplaced: [] });
            expect(week.slots).toHaveLength(1);
        });

        it('leaves tasks that are already fully covered by sticky slots alone', () => {
            const task = makeTask({ id: 'covered', tMax: 60 });
            const week = makeWeek({
                blocks: [wholeWeekBlock()],
                tasks: [task],
                slots: [makeSlotFixture({ blockId: 'b1', taskIds: ['covered'], start: at(0, '08:00'), end: at(0, '09:00') })],
            });

            const report = service.place(week, { window: FULL_WEEK });

            expect(report).toEqual({ placed: [], unplaced: [] });
            expect(week.slots).toHaveLength(1);
        });

        it('batches micro tasks and reports them as placed', () => {
            const micro = makeTask({ tMax: MIN - 1 });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [micro] });

            const report = service.place(week, { window: FULL_WEEK });

            expect(report.placed).toEqual([micro.id]);
            expect(micro.placement).toBe('placed');
            expect(week.slots.filter(s => s.kind === 'batch')).toHaveLength(1);
        });

        it('reports tasks it cannot place with a reason', () => {
            const task = makeTask({ tMax: 600 });
            const week = makeWeek({
                blocks: [makeBlock({ id: 'b1', start: at(0, '08:00'), end: at(0, '09:00') })],
                tasks: [task],
            });

            const report = service.place(week, { window: FULL_WEEK });

            expect(report.placed).toEqual([]);
            expect(report.unplaced).toHaveLength(1);
            expect(report.unplaced[0].taskId).toBe(task.id);
            expect(report.unplaced[0].summary.reason).toBe('CONTAINER_FULL');
            expect(task.placement).toBe('unplaced');
            expect(task.unplacedReason).toBe('CONTAINER_FULL');
        });

        it('places the most important task first', () => {
            const minor = makeTask({ tMax: 60, urgency: 0, complexity: 0 });
            const major = makeTask({ tMax: 60, urgency: UMAX, complexity: CMAX });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [minor, major] });

            service.place(week, { window: FULL_WEEK });

            expect(ms(slotsFor(week.slots, major.id)[0].start))
                .toBeLessThan(ms(slotsFor(week.slots, minor.id)[0].start));
        });

        it('treats a distant deadline as part of the score, not as an automatic first place', () => {
            // dueLate: 0.6 * 0.25 = 0.15, urgent: 0.25 + 0.15 = 0.4
            const dueLate = makeTask({ tMax: 60, urgency: 0, complexity: 0, deadline: at(4, '17:00') });
            const urgent = makeTask({ tMax: 60, urgency: UMAX, complexity: CMAX });
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [dueLate, urgent] });

            service.place(week, { window: FULL_WEEK });

            expect(ms(slotsFor(week.slots, urgent.id)[0].start))
                .toBeLessThan(ms(slotsFor(week.slots, dueLate.id)[0].start));
        });

        it('passes allowBump through to placeTask', () => {
            const task = makeTask();
            const week = makeWeek({ blocks: [wholeWeekBlock()], tasks: [task] });
            const placeTaskSpy = jest.spyOn(service, 'placeTask');

            service.place(week, { window: FULL_WEEK, allowBump: true });

            expect(placeTaskSpy).toHaveBeenCalledWith(week, task, expect.any(Object), true);
        });
    });
});