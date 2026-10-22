import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WeekService } from './week.service';
import { LocalDate } from './time.service';
import { WeekContainer, Change, Task, Interval } from '../dto/scheduler.dto';

/*
 * Fixtures
 * --------
 * Every test gets fresh mocks, so nothing one test sets up leaks into the next.
 *
 * - makeDbWeek(): a week the way Prisma returns it (Dates, slotTasks, dismissals).
 *   It has one block by default so getWeek does not try to seed blocks.
 * - makeWeek(): an in-memory WeekContainer, the shape commit() works on.
 *
 * $transaction runs its callback with the same prisma mock, so writes made inside
 * the transaction are asserted on `prisma.<model>.<method>`.
 */

const WINDOW: Interval = { start: '2026-09-21T05:00:00Z', end: '2026-09-28T00:00:00Z' } as Interval;
const d = (iso: string) => new Date(iso);

function createPrismaMock() {
    const prisma: any = {
        schedulerWeek: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
        schedulerProjectBlock: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
            update: jest.fn(),
        },
        projectPlacement: { findMany: jest.fn().mockResolvedValue([]) },
        schedulerCalendarEntry: { deleteMany: jest.fn(), createMany: jest.fn() },
        schedulerTask: { deleteMany: jest.fn(), upsert: jest.fn() },
        schedulerSubtask: { deleteMany: jest.fn(), createMany: jest.fn() },
        schedulerSlot: { deleteMany: jest.fn(), create: jest.fn() },
        schedulerSlotTask: { deleteMany: jest.fn(), createMany: jest.fn() },
    };
    prisma.$transaction = jest.fn(async (cb: (tx: any) => Promise<void>) => cb(prisma));
    return prisma;
}

function makeDbWeek(o: Record<string, unknown> = {}): any {
    return {
        id: 'W1',
        consultantId: 'C1',
        timezone: 'Africa/Johannesburg',
        weekStart: d('2026-09-21T00:00:00Z'),
        version: 3,
        createdAt: d('2026-09-01T00:00:00Z'),
        updatedAt: d('2026-09-02T00:00:00Z'),
        lastCommittedAt: d('2026-09-03T00:00:00Z'),
        sourceOfLastChange: 'user',
        blocks: [{ id: 'B1', projectId: 'P1', userSized: true, start: d('2026-09-21T05:00:00Z'), end: d('2026-09-21T14:00:00Z') }],
        tasks: [],
        calendarEntries: [],
        slots: [],
        dismissals: [],
        ...o,
    };
}

function makeWeek(o: Partial<WeekContainer> | Record<string, unknown> = {}): WeekContainer {
    return {
        id: 'W1',
        consultantId: 'C1',
        weekStart: '2026-09-21',
        timezone: 'UTC',
        version: 2,
        tasks: [],
        blocks: [],
        slots: [],
        calendarEntries: [],
        holidays: [],
        metadata: {},
        dismissedCodes: [],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-02T00:00:00Z',
        lastCommittedAt: '2026-09-03T00:00:00Z',
        sourceOfLastChange: 'system',
        ...o,
    } as unknown as WeekContainer;
}

const replan: Change = { type: 'replan', window: WINDOW } as Change;
const ctx = () => ({ bumpedEntityIds: [], allocations: [] }) as any;

describe('WeekService', () => {
    let service: WeekService;
    let prisma: any;
    let timeService: any;
    let holidayService: any;
    let placerService: any;
    let validatorService: any;

    beforeEach(() => {
        prisma = createPrismaMock();
        timeService = {
            workingWindows: jest.fn().mockReturnValue([]),
            localDate: jest.fn((iso: string) => String(iso).slice(0, 10)),
            localDateToInstant: jest.fn((date: string) => `${date}T00:00:00Z`),
        };
        holidayService = { getForWeek: jest.fn().mockResolvedValue([]) };
        placerService = { blockMinutes: jest.fn().mockReturnValue(120), place: jest.fn() };
        validatorService = {
            validate: jest.fn().mockReturnValue({ ok: true, issues: [] }),
            summarize: jest.fn().mockReturnValue({ available: 100 }),
        };

        service = new WeekService(prisma, timeService, holidayService, placerService, validatorService);
    });

    afterEach(() => jest.restoreAllMocks());

    // -----------------------------------------------------------------
    // getWeek
    // -----------------------------------------------------------------

    describe('getWeek', () => {
        const originalTz = process.env.SCHEDULER_DEFAULT_TIMEZONE;
        afterEach(() => {
            if (originalTz === undefined) delete process.env.SCHEDULER_DEFAULT_TIMEZONE;
            else process.env.SCHEDULER_DEFAULT_TIMEZONE = originalTz;
        });

        it('loads an existing week with its dismissals included', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek());

            const week = await service.getWeek('C1', '2026-09-21' as LocalDate);

            expect(prisma.schedulerWeek.findUnique).toHaveBeenCalledWith({
                where: { consultantId_weekStart: { consultantId: 'C1', weekStart: d('2026-09-21T00:00:00Z') } },
                include: expect.objectContaining({ dismissals: true, blocks: true }),
            });
            expect(prisma.schedulerWeek.create).not.toHaveBeenCalled();
            expect(week).toMatchObject({
                id: 'W1',
                consultantId: 'C1',
                timezone: 'Africa/Johannesburg',
                weekStart: '2026-09-21',
                version: 3,
                lastCommittedAt: '2026-09-03T00:00:00.000Z',
                sourceOfLastChange: 'user',
                createdAt: '2026-09-01T00:00:00.000Z',
                updatedAt: '2026-09-02T00:00:00.000Z',
                dismissedCodes: [],
            });
        });

        it('creates the week in the configured timezone when it does not exist yet', async () => {
            process.env.SCHEDULER_DEFAULT_TIMEZONE = 'Africa/Johannesburg';
            prisma.schedulerWeek.findUnique.mockResolvedValue(null);
            prisma.schedulerWeek.create.mockResolvedValue(makeDbWeek({ id: 'W-NEW' }));

            const week = await service.getWeek('C1', '2026-09-21' as LocalDate);

            expect(prisma.schedulerWeek.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    consultantId: 'C1',
                    weekStart: d('2026-09-21T00:00:00Z'),
                    timezone: 'Africa/Johannesburg',
                    version: 1,
                    sourceOfLastChange: 'system',
                }),
                include: expect.objectContaining({ dismissals: true }),
            });
            expect(week.id).toBe('W-NEW');
        });

        it('falls back to UTC when no default timezone is configured', async () => {
            delete process.env.SCHEDULER_DEFAULT_TIMEZONE;
            prisma.schedulerWeek.findUnique.mockResolvedValue(null);
            prisma.schedulerWeek.create.mockResolvedValue(makeDbWeek({ timezone: 'UTC' }));

            await service.getWeek('C1', '2026-09-21' as LocalDate);

            expect(prisma.schedulerWeek.create.mock.calls[0][0].data.timezone).toBe('UTC');
        });

        it('fills in defaults for a week that has never been committed', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek({ lastCommittedAt: null, sourceOfLastChange: null }));

            const week = await service.getWeek('C1', '2026-09-21' as LocalDate);

            expect(week.lastCommittedAt).toBe('2026-09-01T00:00:00.000Z');
            expect(week.sourceOfLastChange).toBe('system');
        });

        it('includes the holidays and treats a missing holiday list as none', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek());
            holidayService.getForWeek.mockResolvedValueOnce([{ date: '2026-09-24', name: 'Heritage Day' }]);

            expect((await service.getWeek('C1', '2026-09-21' as LocalDate)).holidays).toEqual([{ date: '2026-09-24', name: 'Heritage Day' }]);

            holidayService.getForWeek.mockResolvedValueOnce(undefined);
            expect((await service.getWeek('C1', '2026-09-21' as LocalDate)).holidays).toEqual([]);
        });

        it('turns database Dates into ISO strings and slot links into task ids', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek({
                slots: [
                    { id: 'S1', start: d('2026-09-21T05:00:00Z'), end: d('2026-09-21T06:00:00Z'), slotTasks: [{ taskId: 'T1' }, { taskId: 'T2' }] },
                    { id: 'S2', start: '2026-09-21T07:00:00Z', end: '2026-09-21T08:00:00Z' },
                ],
                calendarEntries: [{ id: 'CE1', type: 'meeting', start: d('2026-09-21T09:00:00Z'), end: d('2026-09-21T10:00:00Z') }],
            }));

            const week = await service.getWeek('C1', '2026-09-21' as LocalDate);

            expect(week.slots).toEqual([
                expect.objectContaining({ id: 'S1', start: '2026-09-21T05:00:00.000Z', end: '2026-09-21T06:00:00.000Z', taskIds: ['T1', 'T2'] }),
                expect.objectContaining({ id: 'S2', start: '2026-09-21T07:00:00Z', end: '2026-09-21T08:00:00Z', taskIds: [] }),
            ]);
            expect(week.calendarEntries[0]).toMatchObject({ start: '2026-09-21T09:00:00.000Z', end: '2026-09-21T10:00:00.000Z' });
        });

        it('sizes placement blocks from their allocation and leaves user-sized blocks alone', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek({
                blocks: [
                    { id: 'user', userSized: true, allocation: 50, start: d('2026-09-21T05:00:00Z'), end: d('2026-09-21T06:00:00Z') },
                    { id: 'none', userSized: false, allocation: null, start: '2026-09-21T06:00:00Z', end: '2026-09-21T07:00:00Z' },
                    { id: 'sized', userSized: false, allocation: 50, start: d('2026-09-21T07:00:00Z'), end: d('2026-09-21T08:00:00Z') },
                ],
            }));

            const week = await service.getWeek('C1', '2026-09-21' as LocalDate);

            expect(placerService.blockMinutes).toHaveBeenCalledTimes(1);
            expect(placerService.blockMinutes).toHaveBeenCalledWith(50);
            expect(week.blocks).toEqual([
                expect.not.objectContaining({ allocatedMinutes: expect.anything() }),
                expect.not.objectContaining({ allocatedMinutes: expect.anything() }),
                expect.objectContaining({ id: 'sized', allocatedMinutes: 120, start: '2026-09-21T07:00:00.000Z' }),
            ]);
            expect(week.blocks[0].start).toBe('2026-09-21T05:00:00.000Z');
            expect(week.blocks[1].start).toBe('2026-09-21T06:00:00Z');
        });

        it('lists the dismissed advisory codes', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek({
                dismissals: [{ code: 'UNDERUTILISED' }, { code: 'EXTEND_BLOCK' }],
            }));

            const week = await service.getWeek('C1', '2026-09-21' as LocalDate);

            expect(week.dismissedCodes).toEqual(['UNDERUTILISED', 'EXTEND_BLOCK']);
        });

        it('validates a copy of the week, so validate() cannot overwrite the metadata it returns', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek());
            validatorService.validate.mockImplementation((w: any) => {
                w.metadata = 'written by validate';
                return { ok: true, issues: [] };
            });

            const week = await service.getWeek('C1', '2026-09-21' as LocalDate);

            const [validated, validateCtx] = validatorService.validate.mock.calls[0];
            expect(validated).not.toBe(week);
            expect(validated.id).toBe('W1');
            expect(validateCtx).toEqual({ bumpedEntityIds: [], allocations: [] });
            expect(week.metadata).toEqual({ available: 100, alerts: [], warnings: [] });
        });

        it('puts the issues on the metadata, without the advisories the user dismissed', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek({
                dismissals: [{ code: 'UNDERUTILISED' }, { code: 'HARD_CAP_BREACH' }],
            }));
            const hardCap = { level: 'violation', code: 'HARD_CAP_BREACH', message: 'x' };
            const unplaced = { level: 'warning', code: 'UNPLACED_TASKS', message: 'x' };
            const underused = { level: 'warning', code: 'UNDERUTILISED', message: 'x' };
            const info = { level: 'info', code: 'SOME_INFO', message: 'x' };
            validatorService.validate.mockReturnValue({ ok: false, issues: [hardCap, unplaced, underused, info] });

            const week = await service.getWeek('C1', '2026-09-21' as LocalDate);

            expect(validatorService.summarize).toHaveBeenCalledWith(week);
            expect(week.metadata).toEqual({
                available: 100,
                // Violations can't be dismissed
                alerts: [hardCap],
                warnings: [unplaced, info],
            });
        });

        it('treats a validation result without issues as none', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek());
            validatorService.validate.mockReturnValue({ ok: true });

            const week = await service.getWeek('C1', '2026-09-21' as LocalDate);

            expect(week.metadata).toEqual({ available: 100, alerts: [], warnings: [] });
        });
    });

    // -----------------------------------------------------------------
    // Block seeding (an empty week gets blocks from its placements)
    // -----------------------------------------------------------------

    describe('block seeding', () => {
        const emptyWeek = () => makeDbWeek({ id: 'W-SEED', weekStart: d('2026-11-02T00:00:00Z'), blocks: [] });

        beforeEach(() => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(emptyWeek());
            timeService.workingWindows.mockReturnValue([
                { start: '2026-11-02T05:00:00Z', end: '2026-11-02T10:00:00Z' }, // Mon, before lunch
                { start: '2026-11-02T11:00:00Z', end: '2026-11-02T14:00:00Z' }, // Mon, after lunch
                { start: '2026-11-03T05:00:00Z', end: '2026-11-03T14:00:00Z' }, // Tue
                { start: '2026-11-04T05:00:00Z', end: '2026-11-04T14:00:00Z' }, // Wed (holiday)
            ]);
            holidayService.getForWeek.mockResolvedValue([{ date: '2026-11-04' }]);
        });

        it('looks up active placements that overlap the week', async () => {
            await service.getWeek('C1', '2026-11-02' as LocalDate);

            expect(prisma.projectPlacement.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    consultantId: 'C1',
                    status: 'ACTIVE',
                    startDate: { lt: d('2026-11-09T00:00:00Z') },
                    OR: [{ endDate: null }, { endDate: { gte: d('2026-11-02T00:00:00Z') } }],
                },
            }));
        });

        it('creates nothing when there are no placements, and reloads the blocks', async () => {
            prisma.schedulerProjectBlock.findMany.mockResolvedValue([{ id: 'B-RELOADED', allocation: null, start: 'a', end: 'b' }]);

            const week = await service.getWeek('C1', '2026-11-02' as LocalDate);

            expect(prisma.schedulerProjectBlock.createMany).not.toHaveBeenCalled();
            expect(prisma.schedulerProjectBlock.findMany).toHaveBeenCalledWith({ where: { weekId: 'W-SEED' } });
            expect(week.blocks.map((b) => b.id)).toEqual(['B-RELOADED']);
        });

        it('lays out one block per active placement per working day, sized by allocation', async () => {
            prisma.projectPlacement.findMany.mockResolvedValue([
                { id: 'A', projectId: 'PA', allocation: 60, startDate: d('2026-10-01T00:00:00Z'), endDate: null },
                { id: 'B', projectId: 'PB', allocation: 60, startDate: d('2026-10-01T00:00:00Z'), endDate: d('2026-11-02T00:00:00Z') }, // ends Monday
                { id: 'C', projectId: 'PC', allocation: 0, startDate: d('2026-10-01T00:00:00Z'), endDate: null }, // no time
                { id: 'D', projectId: 'PD', allocation: 50, startDate: d('2026-11-03T00:00:00Z'), endDate: null }, // starts Tuesday
            ]);

            await service.getWeek('C1', '2026-11-02' as LocalDate);

            const { data, skipDuplicates } = prisma.schedulerProjectBlock.createMany.mock.calls[0][0];
            expect(skipDuplicates).toBe(true);
            const summary = data.map((b: any) => [b.placementId, b.allocatedMinutes, b.start.toISOString(), b.end.toISOString()]);
            expect(summary).toEqual([
                // Monday: A + B = 120%, so each gets 60/120 of 480 working minutes. Lunch is skipped.
                ['A', 240, '2026-11-02T05:00:00.000Z', '2026-11-02T09:00:00.000Z'],
                ['B', 240, '2026-11-02T09:00:00.000Z', '2026-11-02T14:00:00.000Z'],
                // Tuesday: A + D = 110% of 540 minutes. Wednesday is a holiday.
                ['A', 294, '2026-11-03T05:00:00.000Z', '2026-11-03T09:54:00.000Z'],
                ['D', 245, '2026-11-03T09:54:00.000Z', '2026-11-03T13:59:00.000Z'],
            ]);
            expect(data[0]).toMatchObject({ weekId: 'W-SEED', projectId: 'PA', mobility: 'fluid', userSized: false, id: expect.any(String) });
        });

        it('does not stretch blocks to fill the day when allocations add up to less than 100%', async () => {
            prisma.projectPlacement.findMany.mockResolvedValue([
                { id: 'A', projectId: 'PA', allocation: 50, startDate: d('2026-11-03T00:00:00Z'), endDate: d('2026-11-03T00:00:00Z') },
            ]);

            await service.getWeek('C1', '2026-11-02' as LocalDate);

            const { data } = prisma.schedulerProjectBlock.createMany.mock.calls[0][0];
            expect(data).toHaveLength(1);
            expect(data[0].allocatedMinutes).toBe(270);
        });

        it('creates nothing when every working day is a holiday', async () => {
            prisma.projectPlacement.findMany.mockResolvedValue([
                { id: 'A', projectId: 'PA', allocation: 100, startDate: d('2026-10-01T00:00:00Z'), endDate: null },
            ]);
            timeService.workingWindows.mockReturnValue([{ start: '2026-11-04T05:00:00Z', end: '2026-11-04T14:00:00Z' }]);

            await service.getWeek('C1', '2026-11-02' as LocalDate);

            expect(prisma.schedulerProjectBlock.createMany).not.toHaveBeenCalled();
        });
    });

    describe('workingWindowInstantAt / durationMinutes', () => {
        const windows = [
            { start: '2026-11-02T05:00:00Z', end: '2026-11-02T10:00:00Z' },
            { start: '2026-11-02T11:00:00Z', end: '2026-11-02T14:00:00Z' },
        ];

        it.each([
            [0, '2026-11-02T05:00:00.000Z'],
            [60, '2026-11-02T06:00:00.000Z'],
            [300, '2026-11-02T11:00:00Z'], // end of the first window jumps over lunch
            [360, '2026-11-02T12:00:00.000Z'],
            [480, '2026-11-02T14:00:00Z'], // end of the last window
            [1000, '2026-11-02T14:00:00Z'], // past the end
        ])('offset %i minutes is %s', (offset, expected) => {
            expect(service['workingWindowInstantAt'](windows as any, offset)).toBe(expected);
        });

        it('returns an empty string when there are no windows', () => {
            expect(service['workingWindowInstantAt']([], 10)).toBe('');
        });

        it('measures minutes between two instants', () => {
            expect(service['durationMinutes']('2026-11-02T05:00:00Z', '2026-11-02T07:30:00Z')).toBe(150);
        });
    });

    // -----------------------------------------------------------------
    // commit
    // -----------------------------------------------------------------

    describe('commit', () => {
        it('returns VERSION_CONFLICT with the current week when the version does not match', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek({ version: 7 }));

            const result = await service.commit(makeWeek({ version: 2 }), replan, ctx(), 1);

            expect(result).toEqual({
                ok: false,
                value: expect.objectContaining({ id: 'W1', version: 7 }),
                violations: [expect.objectContaining({ level: 'violation', code: 'VERSION_CONFLICT' })],
                warnings: [],
                infos: [],
            });
            expect(placerService.place).not.toHaveBeenCalled();
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('works on a copy and never changes the week it was given', async () => {
            const week = makeWeek({ tasks: [{ id: 'T1', status: 'Ready' }] });

            const result = await service.commit(week, { type: 'set_status', taskId: 'T1', status: 'Done', window: WINDOW } as Change, ctx(), 2);

            expect(result.value).not.toBe(week);
            expect(result.value.tasks[0].status).toBe('Done');
            expect(week.tasks[0].status).toBe('Ready');
        });

        it('runs the placer, allowing bumps, when the change carries a window', async () => {
            await service.commit(makeWeek(), replan, ctx(), 2);

            expect(placerService.place).toHaveBeenCalledWith(expect.objectContaining({ id: 'W1' }), { window: WINDOW, allowBump: true });
        });

        it('skips the placer when the change has no window', async () => {
            await service.commit(makeWeek({ tasks: [{ id: 'T1' }] }), { type: 'set_status', taskId: 'T1', status: 'Done' } as Change, ctx(), 2);

            expect(placerService.place).not.toHaveBeenCalled();
        });

        it('puts tasks hidden from a place_unplaced run back to unplaced afterwards', async () => {
            const week = makeWeek({
                tasks: [
                    { id: 'chosen', placement: 'unplaced' },
                    { id: 'other', placement: 'unplaced' },
                    { id: 'placed', placement: 'placed' },
                ],
            });
            let seenByPlacer: any[] = [];
            placerService.place.mockImplementation((w: WeekContainer) => {
                seenByPlacer = w.tasks.map((t) => ({ id: t.id, placement: t.placement }));
                w.tasks.find((t) => t.id === 'chosen')!.placement = 'placed';
            });

            const result = await service.commit(week, { type: 'place_unplaced', taskIds: ['chosen'], window: WINDOW } as Change, ctx(), 2);

            // The placer only saw 'chosen' as unplaced
            expect(seenByPlacer).toEqual([
                { id: 'chosen', placement: 'unplaced' },
                { id: 'other', placement: 'placed' },
                { id: 'placed', placement: 'placed' },
            ]);
            expect(result.value.tasks.map((t) => [t.id, t.placement, (t as any)._tempBlinded])).toEqual([
                ['chosen', 'placed', undefined],
                ['other', 'unplaced', undefined],
                ['placed', 'placed', undefined],
            ]);
        });

        describe('validation context', () => {
            const validateCtx = () => validatorService.validate.mock.calls[0][1];

            it('passes the original week as previousWeek and keeps the caller\'s bumped ids', async () => {
                const week = makeWeek();

                await service.commit(week, replan, { bumpedEntityIds: ['X'], allocations: [{ projectId: 'P1' }] } as any, 2);

                expect(validateCtx()).toEqual({ bumpedEntityIds: ['X'], allocations: [{ projectId: 'P1' }], previousWeek: week });
            });

            it('treats a missing bumpedEntityIds list as empty', async () => {
                await service.commit(makeWeek(), replan, { allocations: [] } as any, 2);

                expect(validateCtx().bumpedEntityIds).toEqual([]);
            });

            it('lets calendar_remove touch the entry it removes', async () => {
                const week = makeWeek({ calendarEntries: [{ id: 'CE1' }, { id: 'CE2' }] });

                const result = await service.commit(week, { type: 'calendar_remove', entryId: 'CE1' } as Change, ctx(), 2);

                expect(validateCtx().bumpedEntityIds).toEqual(['CE1']);
                expect(result.value.calendarEntries.map((e) => e.id)).toEqual(['CE2']);
            });

            it('lets calendar_upsert touch the entry it edits', async () => {
                const week = makeWeek({ calendarEntries: [{ id: 'CE1', type: 'meeting' }] });

                await service.commit(week, { type: 'calendar_upsert', entry: { id: 'CE1', type: 'training' } } as Change, ctx(), 2);

                expect(validateCtx().bumpedEntityIds).toEqual(['CE1']);
            });

            it('adds nothing for a calendar_upsert that creates a new entry', async () => {
                await service.commit(makeWeek(), { type: 'calendar_upsert', entry: { type: 'meeting' } } as Change, ctx(), 2);

                expect(validateCtx().bumpedEntityIds).toEqual([]);
            });

            it('does not change the caller\'s bumpedEntityIds array', async () => {
                const callerCtx = ctx();

                await service.commit(makeWeek(), { type: 'calendar_remove', entryId: 'CE1' } as Change, callerCtx, 2);

                expect(callerCtx.bumpedEntityIds).toEqual([]);
            });
        });

        describe('results', () => {
            const violation = { level: 'violation', code: 'HARD_CAP_BREACH', message: 'v' };
            const warning = { level: 'warning', code: 'UNPLACED_TASKS', message: 'w' };
            const dismissedWarning = { level: 'warning', code: 'UNDERUTILISED', message: 'w2' };
            const info = { level: 'info', code: 'SOME_INFO', message: 'i' };
            const dismissedInfo = { level: 'info', code: 'DISMISSED_INFO', message: 'i2' };

            it('returns violations without saving', async () => {
                validatorService.validate.mockReturnValue({ ok: false, issues: [violation, warning, info] });

                const result = await service.commit(makeWeek(), replan, ctx(), 2);

                expect(result).toEqual({ ok: false, value: expect.any(Object), violations: [violation], warnings: [warning], infos: [info] });
                expect(prisma.$transaction).not.toHaveBeenCalled();
            });

            it('leaves out warnings and infos the user dismissed, but never violations', async () => {
                validatorService.validate.mockReturnValue({ ok: false, issues: [violation, warning, dismissedWarning, info, dismissedInfo] });
                const week = makeWeek({ dismissedCodes: ['UNDERUTILISED', 'DISMISSED_INFO', 'HARD_CAP_BREACH'] });

                const result = await service.commit(week, replan, ctx(), 2);

                expect(result.violations).toEqual([violation]);
                expect(result.warnings).toEqual([warning]);
                expect(result.infos).toEqual([info]);
            });

            it('copes with a week that has no dismissed codes list', async () => {
                validatorService.validate.mockReturnValue({ ok: true, issues: [warning, info] });
                const week = makeWeek();
                delete (week as any).dismissedCodes;

                const result = await service.commit(week, replan, ctx(), 2, { dryRun: true });

                expect(result.warnings).toEqual([warning]);
                expect(result.infos).toEqual([info]);
            });

            it('treats a validation result without issues as none', async () => {
                validatorService.validate.mockReturnValue({ ok: true });

                const result = await service.commit(makeWeek(), replan, ctx(), 2);

                expect(result).toMatchObject({ ok: true, violations: [], warnings: [], infos: [] });
            });

            it('does not save a dry run', async () => {
                validatorService.validate.mockReturnValue({ ok: true, issues: [warning] });

                const result = await service.commit(makeWeek(), replan, ctx(), 2, { dryRun: true });

                expect(result).toEqual({ ok: true, value: expect.any(Object), violations: [], warnings: [warning], infos: [] });
                expect(prisma.$transaction).not.toHaveBeenCalled();
            });

            it('saves, bumps the version and rebuilds the metadata on success', async () => {
                validatorService.validate.mockReturnValue({ ok: true, issues: [warning, dismissedWarning] });
                const week = makeWeek({ dismissedCodes: ['UNDERUTILISED'] });

                const result = await service.commit(week, replan, ctx(), 2);

                expect(prisma.$transaction).toHaveBeenCalledTimes(1);
                expect(result).toEqual({ ok: true, value: expect.any(Object), violations: [], warnings: [warning], infos: [] });
                expect(result.value.version).toBe(3);
                expect(result.value.metadata).toEqual({ available: 100, alerts: [], warnings: [warning] });
            });

            it('bumps from the week\'s own version when no expected version was sent', async () => {
                const result = await service.commit(makeWeek({ version: 5 }), replan, ctx());

                expect(result.value.version).toBe(6);
                expect(prisma.schedulerWeek.update).toHaveBeenCalledWith({
                    where: { id: 'W1' },
                    data: { version: { increment: 1 }, lastCommittedAt: expect.any(Date) },
                });
            });

            it('only updates the row when it is still at the expected version', async () => {
                await service.commit(makeWeek(), replan, ctx(), 2);

                expect(prisma.schedulerWeek.update).toHaveBeenCalledWith({
                    where: { id: 'W1', version: 2 },
                    data: { version: { increment: 1 }, lastCommittedAt: expect.any(Date) },
                });
            });

            it('returns VERSION_CONFLICT when the row was changed in the meantime (Prisma P2025)', async () => {
                prisma.$transaction.mockRejectedValueOnce({ code: 'P2025' });
                prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek());

                const result = await service.commit(makeWeek(), replan, ctx(), 2);

                expect(result.ok).toBe(false);
                expect(result.violations[0].code).toBe('VERSION_CONFLICT');
            });

            it.each([
                ['an Error', new Error('DB down')],
                ['another Prisma code', { code: 'P2002' }],
                ['an object without a code', { message: 'odd' }],
                ['a string', 'boom'],
                ['null', null],
            ])('rethrows %s', async (_label, error) => {
                prisma.$transaction.mockRejectedValueOnce(error);

                await expect(service.commit(makeWeek(), replan, ctx(), 2)).rejects.toBe(error);
            });
        });
    });

    // -----------------------------------------------------------------
    // replan / dryRun
    // -----------------------------------------------------------------

    describe('replan and dryRun', () => {
        beforeEach(() => prisma.schedulerWeek.findUnique.mockResolvedValue(makeDbWeek()));

        it('replan loads the week and commits a replan over the whole week', async () => {
            const commitSpy = jest.spyOn(service, 'commit');

            const result = await service.replan('W1', 3);

            expect(prisma.schedulerWeek.findUnique).toHaveBeenNthCalledWith(1, { where: { id: 'W1' } });
            expect(timeService.localDateToInstant).toHaveBeenCalledWith('2026-09-21', 'Africa/Johannesburg');
            expect(timeService.localDateToInstant).toHaveBeenCalledWith('2026-09-28', 'Africa/Johannesburg');
            expect(commitSpy).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'W1', weekStart: '2026-09-21' }),
                { type: 'replan', window: { start: '2026-09-21T00:00:00Z', end: '2026-09-28T00:00:00Z' } },
                { bumpedEntityIds: [], allocations: [] },
                3,
            );
            expect(result.ok).toBe(true);
        });

        it('dryRun loads the week and commits the change without saving', async () => {
            const commitSpy = jest.spyOn(service, 'commit');
            const change = { type: 'replan', window: WINDOW } as Change;

            const result = await service.dryRun('W1', change, 3);

            expect(commitSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'W1' }), change, { bumpedEntityIds: [], allocations: [] }, 3, { dryRun: true });
            expect(result.ok).toBe(true);
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('throws NotFoundException for an unknown week id', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(null);

            await expect(service.replan('missing')).rejects.toThrow(NotFoundException);
            await expect(service.dryRun('missing', replan)).rejects.toThrow('Week missing not found');
        });
    });

    // -----------------------------------------------------------------
    // applyChange
    // -----------------------------------------------------------------

    describe('applyChange', () => {
        const apply = (week: WeekContainer, change: Record<string, unknown>) =>
            service['applyChange'](week, { window: WINDOW, ...change } as unknown as Change);

        it('returns the change window', () => {
            expect(apply(makeWeek(), { type: 'replan' })).toBe(WINDOW);
            expect(service['applyChange'](makeWeek(), { type: 'replan' } as Change)).toBeUndefined();
        });

        it('rejects an unknown change type', () => {
            expect(() => apply(makeWeek(), { type: 'teleport' })).toThrow('unhandled change type "teleport"');
        });

        describe('create_task', () => {
            it('adds the task, keeping ids it already has', () => {
                const week = makeWeek();

                apply(week, { type: 'create_task', task: { id: 'T1', subtasks: [{ id: 'S1' }] } });

                expect(week.tasks).toEqual([{ id: 'T1', subtasks: [{ id: 'S1' }] }]);
            });

            it('generates ids for the task and its subtasks when missing', () => {
                const week = makeWeek();

                apply(week, { type: 'create_task', task: { title: 'New', subtasks: [{ title: 'Sub' }] } });

                expect(week.tasks[0].id).toEqual(expect.any(String));
                expect(week.tasks[0].subtasks![0].id).toEqual(expect.any(String));
            });

            it('accepts a task without subtasks', () => {
                const week = makeWeek();

                apply(week, { type: 'create_task', task: { title: 'Plain' } });

                expect(week.tasks).toHaveLength(1);
            });
        });

        describe('update_task', () => {
            // T1 owns one slot outright and shares a batch slot with T2
            let week: WeekContainer;
            const update = (patch: Record<string, unknown>, taskId = 'T1') => apply(week, { type: 'update_task', taskId, patch });
            const t1 = () => week.tasks.find((t) => t.id === 'T1')!;
            const slotIds = () => week.slots.map((s) => s.id);

            beforeEach(() => {
                week = makeWeek({
                    tasks: [
                        {
                            id: 'T1', projectId: 'P1', tMax: 120, status: 'Ready', deadline: '2026-09-30T15:00:00Z',
                            placement: 'placed', unplacedReason: 'DAY_SPAN_LIMIT', unplacedNeededMinutes: 120, unplacedAvailableMinutes: 60,
                        },
                        { id: 'T2', projectId: 'P1', tMax: 10, status: 'Ready', placement: 'placed' },
                    ],
                    slots: [
                        { id: 'own', kind: 'task', taskIds: ['T1'], locked: false },
                        { id: 'shared', kind: 'batch', taskIds: ['T1', 'T2'], locked: false },
                        { id: 'other', kind: 'task', taskIds: ['T2'], locked: false },
                    ],
                });
            });

            const expectReleased = () => {
                expect(slotIds()).toEqual(['shared', 'other']);
                expect(week.slots.find((s) => s.id === 'shared')!.taskIds).toEqual(['T2']);
                expect(t1()).toMatchObject({
                    placement: 'unplaced', unplacedReason: undefined, unplacedNeededMinutes: undefined, unplacedAvailableMinutes: undefined,
                });
            };

            const expectKept = () => {
                expect(slotIds()).toEqual(['own', 'shared', 'other']);
                expect(week.slots.find((s) => s.id === 'shared')!.taskIds).toEqual(['T1', 'T2']);
                expect(t1()).toMatchObject({ placement: 'placed', unplacedReason: 'DAY_SPAN_LIMIT', unplacedNeededMinutes: 120 });
            };

            it('ignores an unknown task', () => {
                update({ tMax: 999 }, 'missing');

                expectKept();
            });

            it.each([
                ['tMax changes', { tMax: 180 }],
                ['projectId changes', { projectId: 'P2' }],
                ['deadline moves', { deadline: '2026-10-01T15:00:00Z' }],
                ['deadline is cleared', { deadline: undefined }],
            ])('releases the task\'s slots and clears its unplaced details when %s', (_label, patch) => {
                update(patch);

                expectReleased();
                expect(t1()).toMatchObject(patch);
            });

            it('releases the slots when a deadline is added to a task without one', () => {
                delete (t1() as any).deadline;

                update({ deadline: '2026-10-01T15:00:00Z' });

                expectReleased();
            });

            it('keeps the slots when no scheduling field is in the patch', () => {
                update({ title: 'Renamed', urgency: 3 });

                expectKept();
                expect(t1().title).toBe('Renamed');
            });

            it('keeps the slots when scheduling fields are sent with their current values', () => {
                update({ tMax: 120, projectId: 'P1' });

                expectKept();
            });

            it('compares deadlines as instants, not strings', () => {
                update({ deadline: '2026-09-30T17:00:00+02:00' });
                expectKept();

                (t1() as any).deadline = new Date('2026-09-30T15:00:00Z');
                update({ deadline: '2026-09-30T15:00:00.000Z' });
                expectKept();
            });

            it.each(['InProgress', 'Done'])('keeps the slots of a %s task', (status) => {
                (t1() as any).status = status;

                update({ tMax: 180 });

                expectKept();
            });

            it('uses the status after the patch is applied', () => {
                (t1() as any).status = 'InProgress';

                update({ status: 'Ready', tMax: 180 });

                expectReleased();
            });

            it('keeps the slots when the task has a locked slot', () => {
                (week.slots[0] as any).locked = true;

                update({ tMax: 180 });

                expectKept();
            });

            it('ignores locked slots that belong to other tasks', () => {
                (week.slots[2] as any).locked = true;

                update({ tMax: 180 });

                expectReleased();
            });
        });

        describe('delete_task', () => {
            it('removes the task, takes it out of slots, and drops slots left empty', () => {
                const week = makeWeek({
                    tasks: [{ id: 'T1' }, { id: 'T2' }],
                    slots: [{ id: 'own', taskIds: ['T1'] }, { id: 'shared', taskIds: ['T1', 'T2'] }],
                });

                apply(week, { type: 'delete_task', taskId: 'T1' });

                expect(week.tasks.map((t) => t.id)).toEqual(['T2']);
                expect(week.slots).toEqual([{ id: 'shared', taskIds: ['T2'] }]);
            });
        });

        describe('set_status', () => {
            it('sets the status of a known task and ignores an unknown one', () => {
                const week = makeWeek({ tasks: [{ id: 'T1', status: 'Ready' }] });

                apply(week, { type: 'set_status', taskId: 'T1', status: 'InProgress' });
                apply(week, { type: 'set_status', taskId: 'missing', status: 'Done' });

                expect(week.tasks).toEqual([{ id: 'T1', status: 'InProgress' }]);
            });
        });

        describe('toggle_subtask', () => {
            const weekWithSubtasks = () => makeWeek({
                tasks: [{ id: 'T1', status: 'InProgress', subtasks: [{ id: 'S1', done: false }, { id: 'S2', done: false }] }],
            });

            it('toggles a subtask without finishing the task while others are open', () => {
                const week = weekWithSubtasks();

                apply(week, { type: 'toggle_subtask', taskId: 'T1', subtaskId: 'S1' });

                expect(week.tasks[0].subtasks!.map((s) => s.done)).toEqual([true, false]);
                expect(week.tasks[0].status).toBe('InProgress');
            });

            it('marks the task Done when the last subtask is ticked', () => {
                const week = weekWithSubtasks();

                apply(week, { type: 'toggle_subtask', taskId: 'T1', subtaskId: 'S1' });
                apply(week, { type: 'toggle_subtask', taskId: 'T1', subtaskId: 'S2' });

                expect(week.tasks[0].status).toBe('Done');
            });

            it('can untick a subtask', () => {
                const week = weekWithSubtasks();
                week.tasks[0].subtasks![0].done = true;

                apply(week, { type: 'toggle_subtask', taskId: 'T1', subtaskId: 'S1' });

                expect(week.tasks[0].subtasks![0].done).toBe(false);
            });

            it('ignores an unknown task, an unknown subtask, and a task without subtasks', () => {
                const week = weekWithSubtasks();
                week.tasks.push({ id: 'T2', status: 'Ready' } as Task);

                apply(week, { type: 'toggle_subtask', taskId: 'missing', subtaskId: 'S1' });
                apply(week, { type: 'toggle_subtask', taskId: 'T1', subtaskId: 'missing' });
                apply(week, { type: 'toggle_subtask', taskId: 'T2', subtaskId: 'S1' });

                expect(week.tasks[0].subtasks!.map((s) => s.done)).toEqual([false, false]);
                expect(week.tasks[1].status).toBe('Ready');
            });
        });

        describe('split_task', () => {
            const makeSplitWeek = (subtasks?: unknown[]) => makeWeek({
                tasks: [{
                    id: 'T1', title: 'Big', tMin: 90, tMax: 120, status: 'InProgress', placement: 'placed',
                    unplacedReason: 'DAY_SPAN_LIMIT', unplacedNeededMinutes: 120, unplacedAvailableMinutes: 60,
                    subtasks,
                }],
                slots: [
                    { id: 'own', taskIds: ['T1'], subtaskIds: ['S1'] },
                    { id: 'shared', taskIds: ['T1', 'T2'], subtaskIds: ['S1', 'S-OTHER'] },
                    { id: 'shared-no-subtasks', taskIds: ['T1', 'T2'] },
                    { id: 'unrelated', taskIds: ['T2'], subtaskIds: ['S-OTHER'] },
                ],
            });

            it('ignores an unknown task', () => {
                const week = makeSplitWeek();

                apply(week, { type: 'split_task', taskId: 'missing', atMinutes: 60 });

                expect(week.tasks).toHaveLength(1);
            });

            it('splits the time and subtasks into two unplaced tasks', () => {
                const week = makeSplitWeek([
                    { id: 'S1', title: 'First', estimate: 30, done: true },
                    { id: 'S2', title: 'Second', durationMinutes: 30, done: false },
                    { id: 'S3', title: 'Third', estimate: 60, done: false },
                ]);

                apply(week, { type: 'split_task', taskId: 'T1', atMinutes: 60 });

                const [first, second] = week.tasks;
                expect(first).toMatchObject({
                    id: 'T1', tMax: 60, tMin: 45, placement: 'unplaced', status: 'InProgress',
                    unplacedReason: undefined, unplacedNeededMinutes: undefined, unplacedAvailableMinutes: undefined,
                });
                expect(first.subtasks!.map((s) => s.id)).toEqual(['S1', 'S2']);
                expect(second).toMatchObject({
                    title: 'Big', tMax: 60, tMin: 45, status: 'Ready', placement: 'unplaced',
                    unplacedReason: undefined, unplacedNeededMinutes: undefined, unplacedAvailableMinutes: undefined,
                });
                expect(second.id).toEqual(expect.any(String));
                expect(second.id).not.toBe('T1');
                expect(second.subtasks!.map((s) => s.id)).toEqual(['S3']);
            });

            it('releases the task from its slots, keeping shared slots for the other tasks', () => {
                const week = makeSplitWeek([{ id: 'S1', estimate: 60, done: false }, { id: 'S2', estimate: 60, done: false }]);

                apply(week, { type: 'split_task', taskId: 'T1', atMinutes: 60 });

                expect(week.slots).toEqual([
                    { id: 'shared', taskIds: ['T2'], subtaskIds: ['S-OTHER'] },
                    { id: 'shared-no-subtasks', taskIds: ['T2'], subtaskIds: undefined },
                    { id: 'unrelated', taskIds: ['T2'], subtaskIds: ['S-OTHER'] },
                ]);
            });

            it('splits a task without subtasks by time alone', () => {
                const week = makeSplitWeek(undefined);

                apply(week, { type: 'split_task', taskId: 'T1', atMinutes: 30 });

                expect(week.tasks.map((t) => [t.tMax, t.tMin, t.subtasks])).toEqual([[30, 23], [90, 68]].map(([max, min]) => [max, min, []]));
            });

            it.each([
                ['no estimate', { id: 'S1', title: 'Vague', done: false }, 'Cannot split task: subtask "Vague" needs an estimate.'],
                ['a zero estimate', { id: 'S1', title: 'Vague', estimate: 0, done: false }, 'Cannot split task: subtask "Vague" needs an estimate.'],
                ['no estimate or title', { id: 'S1', done: false }, 'Cannot split task: subtask "S1" needs an estimate.'],
            ])('rejects a subtask with %s', (_label, subtask, message) => {
                const week = makeSplitWeek([subtask]);

                expect(() => apply(week, { type: 'split_task', taskId: 'T1', atMinutes: 60 })).toThrow(new BadRequestException(message));
            });

            it.each([
                [{ id: 'S1', title: 'Long', estimate: 90, done: false }, 'Split point falls inside subtask "Long".'],
                [{ id: 'S1', estimate: 90, done: false }, 'Split point falls inside subtask "S1".'],
            ])('rejects a split through the middle of a subtask', (subtask, message) => {
                const week = makeSplitWeek([subtask]);

                expect(() => apply(week, { type: 'split_task', taskId: 'T1', atMinutes: 60 })).toThrow(message);
            });
        });

        describe('accept_deadline_miss', () => {
            it('accepts the miss and clears the unplaced details so the placer tries again', () => {
                const week = makeWeek({
                    tasks: [{ id: 'T1', unplacedReason: 'DEADLINE_INFEASIBLE', unplacedNeededMinutes: 120, unplacedAvailableMinutes: 30 }],
                });

                apply(week, { type: 'accept_deadline_miss', taskId: 'T1' });
                apply(week, { type: 'accept_deadline_miss', taskId: 'missing' });

                expect(week.tasks).toEqual([{
                    id: 'T1', deadlineMissAccepted: true,
                    unplacedReason: undefined, unplacedNeededMinutes: undefined, unplacedAvailableMinutes: undefined,
                }]);
            });
        });

        describe('move_slot', () => {
            const makeMoveWeek = () => makeWeek({
                tasks: [{ id: 'T1', projectId: 'P1' }],
                blocks: [
                    { id: 'other-project', projectId: 'P2', start: '2026-09-22T05:00:00Z', end: '2026-09-22T14:00:00Z' },
                    { id: 'tue', projectId: 'P1', start: '2026-09-22T05:00:00Z', end: '2026-09-22T14:00:00Z' },
                ],
                slots: [{ id: 'S1', blockId: 'mon', taskIds: ['T1'], start: '2026-09-21T05:00:00Z', end: '2026-09-21T06:00:00Z', locked: false }],
            });

            it('moves and locks the slot, sets its tags, and re-homes it to the block that now contains it', () => {
                const week = makeMoveWeek();

                apply(week, { type: 'move_slot', slotId: 'S1', to: { start: '2026-09-22T06:00:00Z', end: '2026-09-22T07:00:00Z' }, tags: ['extended-hours'] });

                expect(week.slots[0]).toEqual(expect.objectContaining({
                    start: '2026-09-22T06:00:00Z', end: '2026-09-22T07:00:00Z', locked: true, tags: ['extended-hours'], blockId: 'tue',
                }));
            });

            it.each([
                ['starts before every block', { start: '2026-09-22T04:00:00Z', end: '2026-09-22T06:00:00Z' }],
                ['ends after every block', { start: '2026-09-22T13:00:00Z', end: '2026-09-22T15:00:00Z' }],
            ])('keeps the old block when the new time %s', (_label, to) => {
                const week = makeMoveWeek();

                apply(week, { type: 'move_slot', slotId: 'S1', to });

                expect(week.slots[0].blockId).toBe('mon');
                expect(week.slots[0].tags).toBeUndefined();
            });

            it('keeps the old block when the slot has no known task', () => {
                const week = makeMoveWeek();
                week.slots[0].taskIds = ['ghost'];

                apply(week, { type: 'move_slot', slotId: 'S1', to: { start: '2026-09-22T06:00:00Z', end: '2026-09-22T07:00:00Z' } });

                expect(week.slots[0].blockId).toBe('mon');
            });

            it('throws NotFoundException for an unknown slot', () => {
                expect(() => apply(makeMoveWeek(), { type: 'move_slot', slotId: 'missing', to: WINDOW }))
                    .toThrow(new NotFoundException('Task slot missing not found'));
            });
        });

        describe('place_unplaced', () => {
            it('hides the unplaced tasks that were not chosen by marking them placed for this run', () => {
                const week = makeWeek({
                    tasks: [
                        { id: 'chosen', placement: 'unplaced' },
                        { id: 'other', placement: 'unplaced' },
                        { id: 'placed', placement: 'placed' },
                    ],
                });

                apply(week, { type: 'place_unplaced', taskIds: ['chosen'] });

                expect(week.tasks).toEqual([
                    { id: 'chosen', placement: 'unplaced' },
                    { id: 'other', placement: 'placed', _tempBlinded: true },
                    { id: 'placed', placement: 'placed' },
                ]);
            });
        });

        describe('blocks', () => {
            const blockWeek = () => makeWeek({ blocks: [{ id: 'B1', start: 'a', end: 'b', mobility: 'fluid', userSized: false }] });
            const to = { start: 'c', end: 'd' };

            it('move_block changes the times only', () => {
                const week = blockWeek();

                apply(week, { type: 'move_block', blockId: 'B1', to });

                expect(week.blocks[0]).toEqual({ id: 'B1', start: 'c', end: 'd', mobility: 'fluid', userSized: false });
            });

            it('resize_block changes the times and marks the block as user-sized', () => {
                const week = blockWeek();

                apply(week, { type: 'resize_block', blockId: 'B1', to });

                expect(week.blocks[0]).toEqual({ id: 'B1', start: 'c', end: 'd', mobility: 'fluid', userSized: true });
            });

            it('pin_block pins and unpins', () => {
                const week = blockWeek();

                apply(week, { type: 'pin_block', blockId: 'B1', pinned: true });
                expect(week.blocks[0].mobility).toBe('pinned');

                apply(week, { type: 'pin_block', blockId: 'B1', pinned: false });
                expect(week.blocks[0].mobility).toBe('fluid');
            });

            it('throws NotFoundException for an unknown block', () => {
                expect(() => apply(blockWeek(), { type: 'move_block', blockId: 'missing', to }))
                    .toThrow(new NotFoundException('Project block missing not found'));
            });
        });

        describe('calendar entries', () => {
            const calWeek = () => makeWeek({ calendarEntries: [{ id: 'CE1', type: 'meeting', start: 'a', end: 'b' }] });

            it('calendar_upsert merges into an existing entry', () => {
                const week = calWeek();

                apply(week, { type: 'calendar_upsert', entry: { id: 'CE1', type: 'training' } });

                expect(week.calendarEntries).toEqual([{ id: 'CE1', type: 'training', start: 'a', end: 'b' }]);
            });

            it('calendar_upsert adds a new entry, keeping its id or generating one', () => {
                const week = calWeek();

                apply(week, { type: 'calendar_upsert', entry: { id: 'CE2', type: 'leave' } });
                apply(week, { type: 'calendar_upsert', entry: { type: 'personal' } });

                expect(week.calendarEntries.map((e) => e.id)).toEqual(['CE1', 'CE2', expect.any(String)]);
                expect(week.calendarEntries[2].type).toBe('personal');
            });

            it('calendar_remove removes the entry', () => {
                const week = calWeek();

                apply(week, { type: 'calendar_remove', entryId: 'CE1' });

                expect(week.calendarEntries).toEqual([]);
            });
        });

        describe('pull_forward', () => {
            it('adds the pulled tasks, generating missing ids', () => {
                const week = makeWeek({ tasks: [{ id: 'T1' }] });

                apply(week, {
                    type: 'pull_forward',
                    taskIds: [],
                    tasks: [{ id: 'T2', subtasks: [{ id: 'S1' }, { title: 'no id' }] }, { title: 'no id' }],
                });

                expect(week.tasks.map((t) => t.id)).toEqual(['T1', 'T2', expect.any(String)]);
                expect(week.tasks[1].subtasks!.map((s) => s.id)).toEqual(['S1', expect.any(String)]);
            });

            it('does nothing without tasks', () => {
                const week = makeWeek({ tasks: [{ id: 'T1' }] });

                apply(week, { type: 'pull_forward', taskIds: [] });

                expect(week.tasks).toHaveLength(1);
            });
        });

        describe('rollover', () => {
            it('unplaces the task, marks it carried over, and takes it out of the slot', () => {
                const week = makeWeek({
                    tasks: [{ id: 'T1', placement: 'placed' }],
                    slots: [{ id: 'S1', taskIds: ['T1', 'T2'] }],
                });

                apply(week, { type: 'rollover', taskId: 'T1', fromSlotId: 'S1' });

                expect(week.tasks[0]).toEqual({ id: 'T1', placement: 'unplaced', carriedOver: true });
                expect(week.slots[0].taskIds).toEqual(['T2']);
            });

            it('ignores an unknown task or slot', () => {
                const week = makeWeek({ tasks: [{ id: 'T1', placement: 'placed' }], slots: [{ id: 'S1', taskIds: ['T1'] }] });

                apply(week, { type: 'rollover', taskId: 'missing', fromSlotId: 'missing' });

                expect(week.tasks[0].placement).toBe('placed');
                expect(week.slots[0].taskIds).toEqual(['T1']);
            });
        });

        describe('mark_incomplete', () => {
            it('moves a Done task back to InProgress and unticks the last ticked subtask', () => {
                const week = makeWeek({
                    tasks: [{ id: 'T1', status: 'Done', subtasks: [{ id: 'S1', done: true }, { id: 'S2', done: true }, { id: 'S3', done: false }] }],
                });

                apply(week, { type: 'mark_incomplete', taskId: 'T1' });

                expect(week.tasks[0].status).toBe('InProgress');
                expect(week.tasks[0].subtasks!.map((s) => s.done)).toEqual([true, false, false]);
            });

            it('moves any other status back to Ready', () => {
                const week = makeWeek({ tasks: [{ id: 'T1', status: 'InProgress', subtasks: [] }] });

                apply(week, { type: 'mark_incomplete', taskId: 'T1' });

                expect(week.tasks[0].status).toBe('Ready');
            });

            it('leaves subtasks alone when none are ticked, and copes without subtasks or an unknown task', () => {
                const week = makeWeek({
                    tasks: [{ id: 'T1', status: 'Done', subtasks: [{ id: 'S1', done: false }] }, { id: 'T2', status: 'Done' }],
                });

                apply(week, { type: 'mark_incomplete', taskId: 'T1' });
                apply(week, { type: 'mark_incomplete', taskId: 'T2' });
                apply(week, { type: 'mark_incomplete', taskId: 'missing' });

                expect(week.tasks[0].subtasks![0].done).toBe(false);
                expect(week.tasks.map((t) => t.status)).toEqual(['InProgress', 'InProgress']);
            });
        });
    });

    // -----------------------------------------------------------------
    // buildMetadata
    // -----------------------------------------------------------------

    describe('buildMetadata', () => {
        it('shows every issue when the week has no dismissed codes list', () => {
            const week = makeWeek();
            delete (week as any).dismissedCodes;
            const violation = { level: 'violation', code: 'A', message: '' };
            const warning = { level: 'warning', code: 'B', message: '' };

            expect(service['buildMetadata'](week, [violation, warning] as any)).toEqual({
                available: 100, alerts: [violation], warnings: [warning],
            });
        });
    });

    // -----------------------------------------------------------------
    // Persisting a committed week
    // -----------------------------------------------------------------

    describe('persisting', () => {
        const commitWeek = (o: Record<string, unknown>) => service.commit(makeWeek(o), replan, ctx(), 2);

        describe('calendar entries', () => {
            it('replaces the entries, mapping types and origins to their database names', async () => {
                await commitWeek({
                    calendarEntries: [
                        { id: 'CE1', type: 'ad-hoc', origin: 'public-holiday', start: '2026-09-21T05:00:00Z', end: '2026-09-21T06:00:00Z', tags: ['x'] },
                        { id: 'CE2', type: 'leave', origin: 'user', start: '2026-09-22T05:00:00Z', end: '2026-09-22T14:00:00Z' },
                    ],
                });

                expect(prisma.schedulerCalendarEntry.deleteMany).toHaveBeenCalledWith({ where: { weekId: 'W1' } });
                expect(prisma.schedulerCalendarEntry.createMany).toHaveBeenCalledWith({
                    data: [
                        { id: 'CE1', weekId: 'W1', type: 'ad_hoc', origin: 'public_holiday', start: d('2026-09-21T05:00:00Z'), end: d('2026-09-21T06:00:00Z'), tags: ['x'] },
                        { id: 'CE2', weekId: 'W1', type: 'leave', origin: 'user', start: d('2026-09-22T05:00:00Z'), end: d('2026-09-22T14:00:00Z'), tags: [] },
                    ],
                });
            });

            it.each([['empty', []], ['missing', undefined]])('only deletes when the list is %s', async (_label, calendarEntries) => {
                await commitWeek({ calendarEntries });

                expect(prisma.schedulerCalendarEntry.deleteMany).toHaveBeenCalled();
                expect(prisma.schedulerCalendarEntry.createMany).not.toHaveBeenCalled();
            });
        });

        describe('tasks and subtasks', () => {
            it('deletes tasks no longer in the week', async () => {
                await commitWeek({ tasks: [{ id: 'T1' }, { id: 'T2' }] });

                expect(prisma.schedulerTask.deleteMany).toHaveBeenCalledWith({ where: { weekId: 'W1', id: { notIn: ['T1', 'T2'] } } });
            });

            it('upserts every field, including the unplaced minutes', async () => {
                await commitWeek({
                    tasks: [{
                        id: 'T1', projectId: 'P1', title: 'Full', tMin: 30, tMax: 60, urgency: 3, complexity: 2,
                        status: 'Ready', placement: 'unplaced', unplacedReason: 'CONTAINER_FULL',
                        unplacedNeededMinutes: 60, unplacedAvailableMinutes: 15, carriedOver: true,
                        deadlineMissAccepted: true, deadline: '2026-09-25T14:00:00Z', dependsOn: ['T0'],
                    }],
                });

                const expected = {
                    weekId: 'W1', projectId: 'P1', title: 'Full', tMin: 30, tMax: 60, urgency: 3, complexity: 2,
                    status: 'Ready', placement: 'unplaced', unplacedReason: 'CONTAINER_FULL',
                    unplacedNeededMinutes: 60, unplacedAvailableMinutes: 15, carriedOver: true,
                    deadlineMissAccepted: true, deadline: d('2026-09-25T14:00:00Z'), dependsOn: ['T0'],
                };
                expect(prisma.schedulerTask.upsert).toHaveBeenCalledWith({ where: { id: 'T1' }, update: expected, create: { id: 'T1', ...expected } });
            });

            it('writes defaults for optional fields, with null for missing unplaced minutes', async () => {
                await commitWeek({ tasks: [{ id: 'T1', projectId: 'P1', title: 'Bare', status: 'Ready', placement: 'placed' }] });

                expect(prisma.schedulerTask.upsert.mock.calls[0][0].update).toMatchObject({
                    unplacedNeededMinutes: null,
                    unplacedAvailableMinutes: null,
                    carriedOver: false,
                    deadlineMissAccepted: false,
                    deadline: null,
                    dependsOn: [],
                });
            });

            it('generates an id for a task without one', async () => {
                await commitWeek({ tasks: [{ title: 'No id' }] });

                const { where, create } = prisma.schedulerTask.upsert.mock.calls[0][0];
                expect(where.id).toEqual(expect.any(String));
                expect(create.id).toBe(where.id);
                // Tasks without an id are left out of the keep-list
                expect(prisma.schedulerTask.deleteMany).toHaveBeenCalledWith({ where: { weekId: 'W1', id: { notIn: [] } } });
            });

            it('replaces subtasks, with defaults and generated ids', async () => {
                await commitWeek({
                    tasks: [{
                        id: 'T1',
                        subtasks: [
                            { id: 'S1', title: 'Write', done: true, estimate: 30 },
                            { },
                        ],
                    }],
                });

                expect(prisma.schedulerSubtask.deleteMany).toHaveBeenCalledWith({ where: { taskId: 'T1' } });
                expect(prisma.schedulerSubtask.createMany).toHaveBeenCalledWith({
                    data: [
                        { id: 'S1', taskId: 'T1', title: 'Write', done: true, estimate: 30 },
                        { id: expect.any(String), taskId: 'T1', title: 'Subtask', done: false, estimate: 0 },
                    ],
                });
            });

            it.each([['empty', []], ['missing', undefined]])('only deletes subtasks when the list is %s', async (_label, subtasks) => {
                await commitWeek({ tasks: [{ id: 'T1', subtasks }] });

                expect(prisma.schedulerSubtask.deleteMany).toHaveBeenCalled();
                expect(prisma.schedulerSubtask.createMany).not.toHaveBeenCalled();
            });

            it('saves user-sized blocks only', async () => {
                await commitWeek({
                    blocks: [
                        { id: 'B1', userSized: true, allocatedMinutes: 90, mobility: 'pinned', start: 'a', end: 'b' },
                        { id: 'B2', userSized: false },
                    ],
                });

                expect(prisma.schedulerProjectBlock.update).toHaveBeenCalledTimes(1);
                expect(prisma.schedulerProjectBlock.update).toHaveBeenCalledWith({
                    where: { id: 'B1' },
                    data: { allocatedMinutes: 90, mobility: 'pinned', start: 'a', end: 'b' },
                });
            });
        });

        describe('slots', () => {
            it('replaces the slots and their task links', async () => {
                await commitWeek({
                    slots: [
                        { id: 'S1', kind: 'task', blockId: 'B1', start: 'a', end: 'b', locked: true, daySpan: 2, taskIds: ['T1', 'T2'] },
                        { id: 'S2', kind: 'batch', blockId: 'B1', start: 'c', end: 'd', locked: false, taskIds: [] },
                        { id: 'S3', kind: 'task', blockId: 'B1', start: 'e', end: 'f', locked: false },
                    ],
                });

                expect(prisma.schedulerSlotTask.deleteMany).toHaveBeenCalledWith({ where: { slot: { weekId: 'W1' } } });
                expect(prisma.schedulerSlot.deleteMany).toHaveBeenCalledWith({ where: { weekId: 'W1' } });
                expect(prisma.schedulerSlot.create.mock.calls.map((c: any[]) => c[0].data)).toEqual([
                    { id: 'S1', weekId: 'W1', kind: 'task', blockId: 'B1', start: 'a', end: 'b', locked: true, daySpan: 2 },
                    { id: 'S2', weekId: 'W1', kind: 'batch', blockId: 'B1', start: 'c', end: 'd', locked: false, daySpan: 1 },
                    { id: 'S3', weekId: 'W1', kind: 'task', blockId: 'B1', start: 'e', end: 'f', locked: false, daySpan: 1 },
                ]);
                expect(prisma.schedulerSlotTask.createMany).toHaveBeenCalledTimes(1);
                expect(prisma.schedulerSlotTask.createMany).toHaveBeenCalledWith({
                    data: [{ slotId: 'S1', taskId: 'T1' }, { slotId: 'S1', taskId: 'T2' }],
                });
            });
        });
    });
});