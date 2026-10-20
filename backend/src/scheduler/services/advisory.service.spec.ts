import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ValidatorService } from './validator.service';
import { TimeService, LocalDate } from './time.service';
import { SCHEDULER_RULES } from './scheduler-rules.constant';
import { WeekContainer, ValidateContext, Task } from '../dto/scheduler.dto';

/*
 * Fixtures
 * --------
 * Week of Mon 2026-09-21, timezone Africa/Johannesburg, but every instant below is
 * written in UTC and the mocked TimeService reads the local date straight off the ISO
 * string, so the tests don't depend on the machine's timezone.
 *
 * Unless a test says otherwise there are no working windows and everything counts as
 * inside core hours, so each test only switches on the rule it is about.
 */

const MIN = SCHEDULER_RULES.MIN_BLOCK_MINUTES;
const DAILY_MAX = SCHEDULER_RULES.DAILY_MAX_MINUTES;

const createBaseWeek = (): WeekContainer => ({
    id: 'week-1',
    consultantId: 'c1',
    timezone: 'Africa/Johannesburg',
    weekStart: '2026-09-21',
    version: 1,
    lastCommittedAt: '2026-09-20T00:00:00Z',
    sourceOfLastChange: 'test',
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
    blocks: [],
    tasks: [],
    slots: [],
    calendarEntries: [],
    holidays: [],
    metadata: {
        available: 0, allocated: 0, scheduled: 0, buffer: 0, utilization: 0,
        softCapBreached: false, hardCapBreached: false, hasOutOfHours: false,
        hasWeekend: false, hasContainerOverflow: false, alerts: [], warnings: [],
    },
}) as unknown as WeekContainer;

const createContext = (previousWeek?: WeekContainer): ValidateContext => ({
    previousWeek,
    bumpedEntityIds: [],
    allocations: [],
});

// Two working windows per day with an unpaid lunch 10:00-11:00 UTC
const workingDay = (date: string) => [
    { start: `${date}T05:00:00Z`, end: `${date}T10:00:00Z` },
    { start: `${date}T11:00:00Z`, end: `${date}T14:00:00Z` },
];

describe('ValidatorService', () => {
    let validator: ValidatorService;
    // Loosely typed so tests can return plain ISO strings from the mocks
    let timeService: any;
    let week: WeekContainer;
    let previous: WeekContainer;
    let context: ValidateContext;

    const issues = () => validator.validate(week, context).issues ?? [];
    const issuesFor = (code: string) => issues().filter((i: any) => i.code === code);
    const firstIssue = (code: string) => issuesFor(code)[0];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ValidatorService,
                {
                    provide: TimeService,
                    useValue: {
                        isInCoreHours: jest.fn().mockReturnValue(true),
                        localDate: jest.fn((iso: string) => String(iso).slice(0, 10) as LocalDate),
                        workingWindows: jest.fn().mockReturnValue([]),
                    },
                },
            ],
        }).compile();

        validator = module.get(ValidatorService);
        timeService = module.get(TimeService);

        week = createBaseWeek();
        previous = createBaseWeek();
        context = createContext(previous);
    });

    afterEach(() => jest.restoreAllMocks());

    // -----------------------------------------------------------------
    // validate(): the orchestrator
    // -----------------------------------------------------------------

    describe('validate', () => {
        it('returns ok with the week, and writes fresh metadata onto it, when there are no violations', () => {
            week.tasks.push({ id: 't1', placement: 'unplaced' } as Task);

            const result = validator.validate(week, context);

            expect(result.ok).toBe(true);
            expect(result.data).toBe(week);
            expect((result.issues ?? []).some((i: any) => i.code === 'UNPLACED_TASKS')).toBe(true);
            expect(week.metadata).toEqual(expect.objectContaining({ scheduled: 0, alerts: [], warnings: [] }));
        });

        it('returns not ok without data, and leaves the metadata untouched, when there is a violation', () => {
            week.metadata = { marker: true } as any;
            week.slots.push({ id: 's1', start: '2026-09-21T00:00:00Z', end: '2026-09-22T21:01:00Z', taskIds: [] } as any);

            const result = validator.validate(week, context);

            expect(result.ok).toBe(false);
            expect((result as any).data).toBeUndefined();
            expect(week.metadata).toEqual({ marker: true });
        });

        it('handles an empty week', () => {
            expect(validator.validate(week, context)).toEqual({ ok: true, data: week, issues: [] });
        });
    });

    // -----------------------------------------------------------------
    // Overlapping events
    // -----------------------------------------------------------------

    describe('OVERLAPPING_EVENTS', () => {
        it('flags a slot that overlaps a calendar entry', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', taskIds: [] } as any);
            week.calendarEntries.push({ id: 'ce1', type: 'meeting', start: '2026-09-21T09:00:00Z', end: '2026-09-21T11:00:00Z' } as any);

            const issue = firstIssue('OVERLAPPING_EVENTS');

            expect(issue.level).toBe('violation');
            expect(issue.message).toBe('Overlap detected between slot s1 and calendar_entry ce1.');
        });

        it('allows events that only touch end to start', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', taskIds: [] } as any);
            week.calendarEntries.push({ id: 'ce1', type: 'meeting', start: '2026-09-21T10:00:00Z', end: '2026-09-21T11:00:00Z' } as any);

            expect(issuesFor('OVERLAPPING_EVENTS')).toEqual([]);
        });

        it('compares each event with the one that ends latest so far, not just its neighbour', () => {
            // long covers both short ones; short1 and short2 don't overlap each other
            week.slots.push(
                { id: 'long', start: '2026-09-21T08:00:00Z', end: '2026-09-21T12:00:00Z', taskIds: [] } as any,
                { id: 'short1', start: '2026-09-21T09:00:00Z', end: '2026-09-21T09:30:00Z', taskIds: [] } as any,
                { id: 'short2', start: '2026-09-21T10:00:00Z', end: '2026-09-21T10:30:00Z', taskIds: [] } as any,
            );

            const messages = issuesFor('OVERLAPPING_EVENTS').map((i: any) => i.message);

            expect(messages).toEqual([
                'Overlap detected between slot long and slot short1.',
                'Overlap detected between slot long and slot short2.',
            ]);
        });
    });

    // -----------------------------------------------------------------
    // #1 OUT_OF_HOURS_UNTAGGED
    // -----------------------------------------------------------------

    describe('#1 OUT_OF_HOURS_UNTAGGED', () => {
        beforeEach(() => timeService.isInCoreHours.mockReturnValue(false));

        it('flags an untagged slot outside core hours', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T18:00:00Z', end: '2026-09-21T19:00:00Z', tags: [], taskIds: [] } as any);

            expect(firstIssue('OUT_OF_HOURS_UNTAGGED')).toMatchObject({ level: 'violation', entityIds: ['s1'] });
        });

        it('flags an untagged calendar entry outside core hours', () => {
            week.calendarEntries.push({ id: 'ce1', type: 'meeting', start: '2026-09-21T18:00:00Z', end: '2026-09-21T19:00:00Z' } as any);

            expect(firstIssue('OUT_OF_HOURS_UNTAGGED')).toMatchObject({ entityIds: ['ce1'] });
        });

        it.each([['extended-hours'], ['weekend']])('accepts items tagged %s', (tag) => {
            week.slots.push({ id: 's1', start: '2026-09-21T18:00:00Z', end: '2026-09-21T19:00:00Z', tags: [tag], taskIds: [] } as any);
            week.calendarEntries.push({ id: 'ce1', type: 'meeting', start: '2026-09-21T20:00:00Z', end: '2026-09-21T21:00:00Z', tags: [tag] } as any);

            expect(issuesFor('OUT_OF_HOURS_UNTAGGED')).toEqual([]);
        });

        it('ignores items inside core hours', () => {
            timeService.isInCoreHours.mockReturnValue(true);
            week.calendarEntries.push({ id: 'ce1', type: 'meeting', start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z' } as any);

            expect(issuesFor('OUT_OF_HOURS_UNTAGGED')).toEqual([]);
        });
    });

    // -----------------------------------------------------------------
    // #2 DAILY_MAX_EXCEEDED
    // -----------------------------------------------------------------

    describe('#2 DAILY_MAX_EXCEEDED', () => {
        it('flags a day whose slots and work entries add up to more than the daily maximum', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T05:00:00Z', end: '2026-09-21T09:00:00Z', taskIds: [] } as any); // 240
            week.calendarEntries.push({ id: 'ce1', type: 'meeting', start: '2026-09-21T09:00:00Z', end: '2026-09-21T14:00:00Z' } as any); // 300

            expect(firstIssue('DAILY_MAX_EXCEEDED')).toEqual({
                level: 'violation',
                code: 'DAILY_MAX_EXCEEDED',
                entityIds: ['s1', 'ce1'],
                message: `Scheduled time on 2026-09-21 is 540m, exceeding the daily limit of ${DAILY_MAX}m.`,
            });
        });

        it('counts each day on its own', () => {
            week.slots.push(
                { id: 'mon', start: '2026-09-21T05:00:00Z', end: '2026-09-21T09:00:00Z', taskIds: [] } as any,
                { id: 'tue', start: '2026-09-22T05:00:00Z', end: '2026-09-22T09:00:00Z', taskIds: [] } as any,
            );

            expect(issuesFor('DAILY_MAX_EXCEEDED')).toEqual([]);
        });

        it.each(['leave', 'personal', 'lunch'])('does not count %s entries as work', (type) => {
            week.calendarEntries.push({ id: 'off', type, start: '2026-09-21T00:00:00Z', end: '2026-09-21T23:00:00Z' } as any);

            expect(issuesFor('DAILY_MAX_EXCEEDED')).toEqual([]);
        });

        it('allows a full-day leave entry (the 07:00-16:00 case)', () => {
            timeService.workingWindows.mockReturnValue(workingDay('2026-09-21'));
            week.calendarEntries.push({ id: 'leave', type: 'leave', start: '2026-09-21T05:00:00Z', end: '2026-09-21T14:00:00Z' } as any);

            expect(issues().filter((i: any) => i.level === 'violation')).toEqual([]);
        });

        it('does not count the unpaid lunch hour inside a long work entry', () => {
            timeService.workingWindows.mockReturnValue(workingDay('2026-09-21'));
            // 540 minutes on the clock, 60 of them lunch -> 480 of work, which is allowed
            week.calendarEntries.push({ id: 'training', type: 'training', start: '2026-09-21T05:00:00Z', end: '2026-09-21T14:00:00Z' } as any);

            expect(issuesFor('DAILY_MAX_EXCEEDED')).toEqual([]);

            // One more hour of work on the same day tips it over
            week.slots.push({ id: 's1', start: '2026-09-21T14:00:00Z', end: '2026-09-21T15:00:00Z', taskIds: [] } as any);
            expect(firstIssue('DAILY_MAX_EXCEEDED').message).toContain('540m');
        });

        it('finds lunch breaks however the working windows are ordered, on every day', () => {
            // Out of order, two days, and a day whose windows touch (no lunch gap)
            timeService.workingWindows.mockReturnValue([
                ...workingDay('2026-09-22').reverse(),
                ...workingDay('2026-09-21'),
                { start: '2026-09-23T05:00:00Z', end: '2026-09-23T10:00:00Z' },
                { start: '2026-09-23T10:00:00Z', end: '2026-09-23T14:00:00Z' },
            ]);

            expect(validator['lunchIntervals'](week)).toEqual([
                { start: '2026-09-22T10:00:00Z', end: '2026-09-22T11:00:00Z' },
                { start: '2026-09-21T10:00:00Z', end: '2026-09-21T11:00:00Z' },
            ]);
        });

        it('skips work entries that fall entirely inside lunch', () => {
            timeService.workingWindows.mockReturnValue(workingDay('2026-09-21'));
            week.calendarEntries.push({ id: 'lunch-call', type: 'meeting', start: '2026-09-21T10:00:00Z', end: '2026-09-21T11:00:00Z' } as any);

            const totals = validator['checkDailyMaxExceeded'](week);

            expect(totals).toEqual([]);
        });

        it('measures overlap in whole minutes, and zero when intervals do not meet', () => {
            const a = { start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z' };

            expect(validator['overlapMinutes'](a, { start: '2026-09-21T08:30:00Z', end: '2026-09-21T10:00:00Z' })).toBe(30);
            expect(validator['overlapMinutes'](a, { start: '2026-09-21T09:00:00Z', end: '2026-09-21T10:00:00Z' })).toBe(0);
        });
    });

    // -----------------------------------------------------------------
    // #3 / #4 caps
    // -----------------------------------------------------------------

    describe('#3 SOFT_CAP_BREACH', () => {
        it('warns when scheduled time exceeds the contract', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T00:00:00Z', end: '2026-09-22T17:00:00Z', taskIds: [] } as any); // 2460

            expect(firstIssue('SOFT_CAP_BREACH')).toEqual({
                level: 'warning',
                code: 'SOFT_CAP_BREACH',
                message: 'Scheduled hours exceed the contract by 60 minutes.',
            });
        });

        it('stays quiet at or under the contract', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T00:00:00Z', end: '2026-09-22T16:00:00Z', taskIds: [] } as any); // 2400

            expect(issuesFor('SOFT_CAP_BREACH')).toEqual([]);
        });
    });

    describe('#4 HARD_CAP_BREACH', () => {
        it('passes at exactly the legal maximum', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T00:00:00Z', end: '2026-09-22T21:00:00Z', taskIds: [] } as any); // 2700

            expect(issuesFor('HARD_CAP_BREACH')).toEqual([]);
        });

        it('fails above it and lists placed tasks to defer, lowest urgency + complexity first', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T00:00:00Z', end: '2026-09-22T21:01:00Z', taskIds: [] } as any); // 2701
            week.tasks.push(
                { id: 'high', urgency: 4, complexity: 3, placement: 'placed' } as Task,
                { id: 'low', urgency: 1, complexity: 1, placement: 'placed' } as Task,
                { id: 'mid', urgency: 2, complexity: 2, placement: 'placed' } as Task,
                { id: 'unplaced', urgency: 1, complexity: 1, placement: 'unplaced' } as Task,
            );

            expect(firstIssue('HARD_CAP_BREACH')).toEqual({
                level: 'violation',
                code: 'HARD_CAP_BREACH',
                message: 'Scheduled hours breach the legal maximum by 1 minutes.',
                entityIds: ['low', 'mid', 'high'],
            });
        });
    });

    // -----------------------------------------------------------------
    // #5 FRAGMENT_TOO_SMALL
    // -----------------------------------------------------------------

    describe('#5 FRAGMENT_TOO_SMALL', () => {
        it('flags a task slot shorter than the minimum block', () => {
            week.slots.push({ id: 's1', kind: 'task', start: '2026-09-21T08:00:00Z', end: '2026-09-21T08:30:00Z', taskIds: [] } as any);

            expect(firstIssue('FRAGMENT_TOO_SMALL')).toMatchObject({
                entityIds: ['s1'],
                message: `Slot s1 is 30m, below the ${MIN}m minimum.`,
            });
        });

        it('ignores batch slots and slots of at least the minimum', () => {
            week.slots.push(
                { id: 'batch', kind: 'batch', start: '2026-09-21T08:00:00Z', end: '2026-09-21T08:30:00Z', taskIds: [] } as any,
                { id: 'ok', kind: 'task', start: '2026-09-21T09:00:00Z', end: '2026-09-21T10:00:00Z', taskIds: [] } as any,
            );

            expect(issuesFor('FRAGMENT_TOO_SMALL')).toEqual([]);
        });
    });

    // -----------------------------------------------------------------
    // #6 FROZEN_ENTITY_MOVED
    // -----------------------------------------------------------------

    describe('#6 FROZEN_ENTITY_MOVED', () => {
        const frozenIds = () => issuesFor('FROZEN_ENTITY_MOVED').flatMap((i: any) => i.entityIds);

        it('skips every frozen check on the first commit of a week (no previous week)', () => {
            context = createContext(undefined);
            week.blocks.push({ id: 'b1', mobility: 'pinned', start: 'new-time' } as any);

            expect(frozenIds()).toEqual([]);
        });

        it('treats a missing bumpedEntityIds list as empty', () => {
            context = { previousWeek: previous, allocations: [] } as any;
            previous.calendarEntries.push({ id: 'ce1', start: '2026-09-21T10:00:00Z', end: '2026-09-21T11:00:00Z' } as any);

            expect(frozenIds()).toEqual(['ce1']);
        });

        describe('pinned blocks', () => {
            const pinned = { id: 'b1', mobility: 'pinned', start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z' };

            it('flags a pinned block whose start or end changed', () => {
                previous.blocks.push(pinned as any, { ...pinned, id: 'b2' } as any);
                week.blocks.push(
                    { ...pinned, start: '2026-09-21T09:00:00Z' } as any,
                    { ...pinned, id: 'b2', end: '2026-09-21T10:00:00Z' } as any,
                );

                expect(issuesFor('FROZEN_ENTITY_MOVED').map((i: any) => i.message)).toEqual([
                    'Pinned block b1 was moved.', 'Pinned block b2 was moved.',
                ]);
            });

            it('allows unchanged pinned blocks, moved fluid blocks, and blocks the change named', () => {
                previous.blocks.push(pinned as any, { ...pinned, id: 'fluid', mobility: 'fluid' } as any, { ...pinned, id: 'bumped' } as any);
                week.blocks.push(
                    pinned as any,
                    { ...pinned, id: 'fluid', mobility: 'fluid', start: '2026-09-21T12:00:00Z' } as any,
                    { ...pinned, id: 'bumped', start: '2026-09-21T12:00:00Z' } as any,
                );
                context.bumpedEntityIds = ['bumped'];

                expect(frozenIds()).toEqual([]);
            });
        });

        describe('in-progress and done tasks', () => {
            it('flags a done task that changed status', () => {
                previous.tasks.push({ id: 't1', status: 'Done', placement: 'placed' } as Task);
                week.tasks.push({ id: 't1', status: 'Ready', placement: 'placed' } as Task);

                expect(firstIssue('FROZEN_ENTITY_MOVED')).toMatchObject({ entityIds: ['t1'], message: 'Frozen task t1 mutated.' });
            });

            it('flags a frozen task whose placement changed or that disappeared', () => {
                previous.tasks.push(
                    { id: 'moved', status: 'InProgress', placement: 'placed' } as Task,
                    { id: 'gone', status: 'InProgress', placement: 'placed' } as Task,
                );
                week.tasks.push({ id: 'moved', status: 'InProgress', placement: 'unplaced' } as Task);

                expect(frozenIds()).toEqual(['moved', 'gone']);
            });

            it('allows InProgress to become Done', () => {
                previous.tasks.push({ id: 't1', status: 'InProgress', placement: 'placed' } as Task);
                week.tasks.push({ id: 't1', status: 'Done', placement: 'placed' } as Task);

                expect(frozenIds()).toEqual([]);
            });

            it('ignores Ready tasks and tasks the change named', () => {
                previous.tasks.push(
                    { id: 'ready', status: 'Ready', placement: 'placed' } as Task,
                    { id: 'bumped', status: 'Done', placement: 'placed' } as Task,
                );
                week.tasks.push(
                    { id: 'ready', status: 'Ready', placement: 'unplaced' } as Task,
                    { id: 'bumped', status: 'Ready', placement: 'unplaced' } as Task,
                );
                context.bumpedEntityIds = ['bumped'];

                expect(frozenIds()).toEqual([]);
            });
        });

        describe('locked slots', () => {
            const locked = { id: 's1', locked: true, start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z', blockId: 'b1', taskIds: ['t1'] };

            it.each([
                ['its start', { start: '2026-09-21T07:00:00Z' }],
                ['its end', { end: '2026-09-21T10:00:00Z' }],
                ['its block', { blockId: 'b2' }],
                ['its tasks', { taskIds: ['t2'] }],
            ])('flags a locked slot when %s changes', (_label, patch) => {
                previous.slots.push(locked as any);
                week.slots.push({ ...locked, ...patch } as any);

                expect(firstIssue('FROZEN_ENTITY_MOVED')).toMatchObject({ entityIds: ['s1'], message: 'Locked slot s1 moved.' });
            });

            it('flags a locked slot that disappeared', () => {
                previous.slots.push(locked as any);

                expect(frozenIds()).toEqual(['s1']);
            });

            it('allows unchanged locked slots, moved unlocked slots, and slots the change named', () => {
                previous.slots.push(
                    locked as any,
                    { ...locked, id: 'free', locked: false } as any,
                    { ...locked, id: 'bumped' } as any,
                );
                week.slots.push(
                    locked as any,
                    { ...locked, id: 'free', locked: false, start: '2026-09-21T12:00:00Z' } as any,
                    { ...locked, id: 'bumped', start: '2026-09-21T12:00:00Z' } as any,
                );
                context.bumpedEntityIds = ['bumped'];

                expect(frozenIds()).toEqual([]);
            });
        });

        describe('calendar entries', () => {
            const entry = { id: 'ce1', type: 'meeting', start: '2026-09-21T10:00:00Z', end: '2026-09-21T11:00:00Z' };

            it('reports a removed entry as removed', () => {
                previous.calendarEntries.push(entry as any);

                expect(firstIssue('FROZEN_ENTITY_MOVED')).toEqual({
                    level: 'violation', code: 'FROZEN_ENTITY_MOVED', entityIds: ['ce1'], message: 'Calendar entry ce1 was removed.',
                });
            });

            it.each([
                ['start', { start: '2026-09-21T09:00:00Z' }],
                ['end', { end: '2026-09-21T12:00:00Z' }],
            ])('reports an entry whose %s changed as moved', (_label, patch) => {
                previous.calendarEntries.push(entry as any);
                week.calendarEntries.push({ ...entry, ...patch } as any);

                expect(firstIssue('FROZEN_ENTITY_MOVED').message).toBe('Calendar entry ce1 moved.');
            });

            it('compares instants, so the same time written differently is not a move', () => {
                previous.calendarEntries.push(entry as any);
                week.calendarEntries.push({ ...entry, start: '2026-09-21T10:00:00.000Z', end: '2026-09-21T13:00:00+02:00' } as any);

                expect(frozenIds()).toEqual([]);
            });

            it('allows the entry the change names to be moved or removed', () => {
                previous.calendarEntries.push(entry as any, { ...entry, id: 'ce2' } as any);
                week.calendarEntries.push({ ...entry, id: 'ce2', start: '2026-09-21T12:00:00Z', end: '2026-09-21T13:00:00Z' } as any);
                context.bumpedEntityIds = ['ce1', 'ce2'];

                expect(frozenIds()).toEqual([]);
            });
        });
    });

    // -----------------------------------------------------------------
    // #7 DEPENDENCY_ORDER
    // -----------------------------------------------------------------

    describe('#7 DEPENDENCY_ORDER', () => {
        beforeEach(() => {
            week.tasks.push(
                { id: 'dep', dependsOn: [], status: 'Ready' } as any,
                { id: 'task', dependsOn: ['dep'], status: 'Ready' } as any,
            );
        });

        it('flags a task that starts before its prerequisite finishes', () => {
            week.slots.push(
                { id: 's1', taskIds: ['task'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' } as any,
                { id: 's2', taskIds: ['dep'], start: '2026-09-21T09:00:00Z', end: '2026-09-21T11:00:00Z' } as any,
            );

            expect(firstIssue('DEPENDENCY_ORDER')).toEqual({
                level: 'violation',
                code: 'DEPENDENCY_ORDER',
                message: 'Task task starts before prerequisite dep finishes.',
                entityIds: ['task', 'dep'],
            });
        });

        it('allows a task that starts after its prerequisite finishes', () => {
            week.slots.push(
                { id: 's1', taskIds: ['dep'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z' } as any,
                { id: 's2', taskIds: ['task'], start: '2026-09-21T09:00:00Z', end: '2026-09-21T10:00:00Z' } as any,
            );

            expect(issuesFor('DEPENDENCY_ORDER')).toEqual([]);
        });

        it('ignores a prerequisite that is already done', () => {
            week.tasks[0].status = 'Done';
            week.slots.push(
                { id: 's1', taskIds: ['task'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' } as any,
                { id: 's2', taskIds: ['dep'], start: '2026-09-21T09:00:00Z', end: '2026-09-21T11:00:00Z' } as any,
            );

            expect(issuesFor('DEPENDENCY_ORDER')).toEqual([]);
        });

        it('ignores a prerequisite with no slots, and a dependent with no slots', () => {
            week.slots.push({ id: 's1', taskIds: ['task'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' } as any);
            expect(issuesFor('DEPENDENCY_ORDER')).toEqual([]);

            week.slots = [{ id: 's2', taskIds: ['dep'], start: '2026-09-21T09:00:00Z', end: '2026-09-21T11:00:00Z' } as any];
            expect(issuesFor('DEPENDENCY_ORDER')).toEqual([]);
        });

        it('handles slots without task ids', () => {
            week.slots.push({ id: 'empty', start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z' } as any);

            expect(issuesFor('DEPENDENCY_ORDER')).toEqual([]);
        });

        it('copes with a task that has no dependsOn list and with an empty slot list', () => {
            expect(validator['getDependencyIssuesForTask']({ id: 'x' } as Task, 0, new Map(), new Map())).toEqual([]);
            expect(validator['getEarliestStart']([])).toBeNull();
            expect(validator['getLatestEnd']([])).toBeNull();
        });
    });

    // -----------------------------------------------------------------
    // #8 / #10 project allocation
    // -----------------------------------------------------------------

    describe('#8 TASK_LARGER_THAN_CONTAINER', () => {
        it('flags a placed task larger than its project allocation', () => {
            week.blocks.push({ projectId: 'p1', allocatedMinutes: 100 } as any);
            week.tasks.push({ id: 't1', projectId: 'p1', tMax: 120, placement: 'placed', status: 'Ready' } as Task);

            expect(firstIssue('TASK_LARGER_THAN_CONTAINER')).toEqual({
                level: 'violation',
                code: 'TASK_LARGER_THAN_CONTAINER',
                message: 'Task t1 (120m) exceeds project p1 allocation (100m).',
                entityIds: ['t1'],
            });
        });

        it('ignores done, unplaced and fitting tasks, and projects with no blocks', () => {
            week.blocks.push({ projectId: 'p1', allocatedMinutes: 60 } as any, { projectId: 'p1', allocatedMinutes: 60 } as any);
            week.tasks.push(
                { id: 'fits', projectId: 'p1', tMax: 120, placement: 'placed', status: 'Ready' } as Task,
                { id: 'done', projectId: 'p1', tMax: 999, placement: 'placed', status: 'Done' } as Task,
                { id: 'unplaced', projectId: 'p1', tMax: 999, placement: 'unplaced', status: 'Ready' } as Task,
                { id: 'no-blocks', projectId: 'p2', tMax: 999, placement: 'placed', status: 'Ready' } as Task,
            );

            expect(issuesFor('TASK_LARGER_THAN_CONTAINER')).toEqual([]);
        });
    });

    describe('#10 CONTAINER_OVERFLOW', () => {
        it('warns when a project\'s tasks add up to more than its allocation', () => {
            week.blocks.push({ projectId: 'p1', allocatedMinutes: 100 } as any);
            week.tasks.push({ id: 't1', projectId: 'p1', tMax: 60 } as any, { id: 't2', projectId: 'p1', tMax: 60 } as any);

            expect(firstIssue('CONTAINER_OVERFLOW')).toEqual({
                level: 'warning',
                code: 'CONTAINER_OVERFLOW',
                message: 'Project p1 tasks (120m) overflow allocation (100m).',
                entityIds: ['t1', 't2'],
            });
        });

        it('treats a project with no blocks as having no allocation', () => {
            week.tasks.push({ id: 't1', projectId: 'p2', tMax: 30 } as any);

            expect(firstIssue('CONTAINER_OVERFLOW').message).toContain('allocation (0m)');
        });

        it('stays quiet when tasks fit', () => {
            week.blocks.push({ projectId: 'p1', allocatedMinutes: 100 } as any);
            week.tasks.push({ id: 't1', projectId: 'p1', tMax: 100 } as any);

            expect(issuesFor('CONTAINER_OVERFLOW')).toEqual([]);
        });
    });

    // -----------------------------------------------------------------
    // #9 / #11 / #12 task warnings
    // -----------------------------------------------------------------

    describe('#9 DAY_SPAN_LIMIT_AT_RISK', () => {
        const maxCapacity = SCHEDULER_RULES.FRAGMENT_MAX_COUNT * DAILY_MAX;

        it('warns about tasks bigger than the most the day-span limit allows', () => {
            week.tasks.push({ id: 'giant', tMax: maxCapacity + 1 } as any, { id: 'ok', tMax: maxCapacity } as any);

            expect(firstIssue('DAY_SPAN_LIMIT_AT_RISK')).toMatchObject({ level: 'warning', entityIds: ['giant'] });
        });

        it('stays quiet when every task fits', () => {
            week.tasks.push({ id: 'ok', tMax: maxCapacity } as any);

            expect(issuesFor('DAY_SPAN_LIMIT_AT_RISK')).toEqual([]);
        });
    });

    describe('#11 UNPLACED_TASKS', () => {
        it('warns with the count and the unplaced task ids', () => {
            week.tasks.push({ id: 't1', placement: 'unplaced' } as any, { id: 't2', placement: 'placed' } as any);

            expect(firstIssue('UNPLACED_TASKS')).toEqual({
                level: 'warning', code: 'UNPLACED_TASKS', message: 'There are 1 unplaced tasks.', entityIds: ['t1'],
            });
        });
    });

    describe('#12 DEADLINE_INFEASIBLE', () => {
        it('warns about tasks the placer marked as missing their deadline', () => {
            week.tasks.push(
                { id: 't1', placement: 'unplaced', unplacedReason: 'DEADLINE_INFEASIBLE' } as any,
                { id: 't2', placement: 'unplaced', unplacedReason: 'CONTAINER_FULL' } as any,
            );

            expect(firstIssue('DEADLINE_INFEASIBLE')).toMatchObject({ entityIds: ['t1'], message: '1 task(s) cannot be placed before their deadline.' });
        });

        it('stays quiet when no task has that reason', () => {
            expect(issuesFor('DEADLINE_INFEASIBLE')).toEqual([]);
        });
    });

    // -----------------------------------------------------------------
    // #13 CONTAINERS_EXCEED_CONTRACT
    // -----------------------------------------------------------------

    describe('#13 CONTAINERS_EXCEED_CONTRACT', () => {
        it('raises a persistent violation and logs it when allocations exceed the contract', () => {
            const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
            context.allocations = [{ projectId: 'p1', allocation: 105, allocatedMinutes: 2520 }] as any;

            expect(firstIssue('CONTAINERS_EXCEED_CONTRACT')).toMatchObject({ level: 'violation', persistent: true });
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('CONTAINERS_EXCEED_CONTRACT'));
        });

        it('does not false-positive on fractional percentages that add up to 100', () => {
            context.allocations = Array(7).fill({ allocation: 14.2857 }) as any;

            expect(issuesFor('CONTAINERS_EXCEED_CONTRACT')).toEqual([]);
        });

        it('skips the check when there are no allocations', () => {
            context.allocations = undefined as any;

            expect(issuesFor('CONTAINERS_EXCEED_CONTRACT')).toEqual([]);
        });
    });

    // -----------------------------------------------------------------
    // #14 INVALID_ENTRY_ORIGIN
    // -----------------------------------------------------------------

    describe('#14 INVALID_ENTRY_ORIGIN', () => {
        it('flags a public-holiday entry on a day that is not a holiday', () => {
            week.calendarEntries.push({ id: 'ce1', type: 'leave', origin: 'public-holiday', start: '2026-12-25T08:00:00Z', end: '2026-12-25T09:00:00Z' } as any);
            week.holidays.push({ date: '2026-12-26' } as any);

            expect(firstIssue('INVALID_ENTRY_ORIGIN')).toMatchObject({
                entityIds: ['ce1'],
                message: 'Entry ce1 is marked as public-holiday but no holiday exists on 2026-12-25.',
            });
        });

        it('accepts a public-holiday entry on a holiday and ignores other origins', () => {
            week.calendarEntries.push(
                { id: 'ce1', type: 'leave', origin: 'public-holiday', start: '2026-09-24T08:00:00Z', end: '2026-09-24T09:00:00Z' } as any,
                { id: 'ce2', type: 'meeting', origin: 'user', start: '2026-09-22T08:00:00Z', end: '2026-09-22T09:00:00Z' } as any,
            );
            week.holidays.push({ date: '2026-09-24' } as any);

            expect(issuesFor('INVALID_ENTRY_ORIGIN')).toEqual([]);
        });
    });

    // -----------------------------------------------------------------
    // summarize
    // -----------------------------------------------------------------

    describe('summarize', () => {
        beforeEach(() => {
            timeService.workingWindows.mockReturnValue(
                ['21', '22', '23', '24', '25'].map((d) => ({ start: `2026-09-${d}T06:00:00Z`, end: `2026-09-${d}T14:00:00Z` })),
            );
        });

        it('counts the working windows as available time', () => {
            const metadata = validator.summarize(week);

            expect(metadata).toEqual({
                available: 2400, allocated: 0, scheduled: 0, buffer: 2400, utilization: 0,
                softCapBreached: false, hardCapBreached: false, hasOutOfHours: false, hasWeekend: false,
                hasContainerOverflow: false,
                // Issues are added later by WeekService.buildMetadata
                alerts: [], warnings: [],
            });
        });

        it('removes public holidays and the time calendar entries take', () => {
            week.holidays.push({ date: '2026-09-24' } as any);
            week.calendarEntries.push(
                { id: 'ce1', type: 'meeting', start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' } as any,
                { id: 'outside', type: 'meeting', start: '2026-09-21T15:00:00Z', end: '2026-09-21T16:00:00Z' } as any,
            );

            expect(validator.summarize(week).available).toBe(2400 - 480 - 120);
        });

        it('adds up block allocations and scheduled slot time', () => {
            week.blocks.push({ projectId: 'p1', allocatedMinutes: 300 } as any, { projectId: 'p2', allocatedMinutes: 200 } as any);
            week.slots.push({ id: 's1', start: '2026-09-21T06:00:00Z', end: '2026-09-21T08:00:00Z', taskIds: [] } as any);

            const metadata = validator.summarize(week);

            expect(metadata).toMatchObject({ allocated: 500, scheduled: 120, buffer: 2280, utilization: 120 / 2400 });
        });

        it('flags out-of-hours and weekend items', () => {
            timeService.isInCoreHours.mockReturnValue(false);
            week.calendarEntries.push({ id: 'sat', type: 'meeting', tags: ['weekend'], start: '2026-09-26T08:00:00Z', end: '2026-09-26T09:00:00Z' } as any);

            expect(validator.summarize(week)).toMatchObject({ hasOutOfHours: true, hasWeekend: true });
        });

        it('reports cap breaches and container overflow', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T00:00:00Z', end: '2026-09-22T21:01:00Z', taskIds: [] } as any);
            week.tasks.push({ id: 't1', projectId: 'p1', tMax: 60 } as any);

            expect(validator.summarize(week)).toMatchObject({ softCapBreached: true, hardCapBreached: true, hasContainerOverflow: true });
        });

        it('reports zero utilisation when nothing is available', () => {
            timeService.workingWindows.mockReturnValue([]);
            week.slots.push({ id: 's1', start: '2026-09-21T06:00:00Z', end: '2026-09-21T08:00:00Z', taskIds: [] } as any);

            expect(validator.summarize(week).utilization).toBe(0);
        });
    });
});