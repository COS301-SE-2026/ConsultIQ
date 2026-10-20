import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdvisoryService } from './advisory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService } from './week.service';
import { PlacerService } from './placer.service';
import { TimeService, LocalDate, Instant } from './time.service';
import { SCHEDULER_RULES } from './scheduler-rules.constant';
import { WeekContainer } from '../dto/scheduler.dto';

/*
 * Fixtures
 * --------
 * Week of Mon 2026-09-21, timezone UTC. The mocked TimeService gives one working
 * window per weekday, 07:00-16:00, and reads the local date straight off the ISO string.
 *
 * With the real SCHEDULER_RULES the buffer target is
 * CONTRACT_SOFT_CAP_MINUTES * BUFFER_TARGET_PERCENTAGE, so the spare "gap" is
 * available - scheduled - that buffer.
 */

const WEEK_ID = 'week-1';
const CONSULTANT_ID = 'cons-1';
const WEEK_START = '2026-09-21' as LocalDate;
const BUFFER = Math.round(SCHEDULER_RULES.CONTRACT_SOFT_CAP_MINUTES * SCHEDULER_RULES.BUFFER_TARGET_PERCENTAGE);

// day: 0 = Mon ... 4 = Fri
const at = (day: number, time: string) => `2026-09-${String(21 + day).padStart(2, '0')}T${time}:00Z`;

function workingWindows() {
    return [0, 1, 2, 3, 4].map((d) => ({ start: at(d, '07:00'), end: at(d, '16:00') }));
}

// Loose overrides so tests only spell out the fields they care about
function makeWeek(o: Record<string, unknown> = {}): WeekContainer {
    return {
        id: WEEK_ID,
        consultantId: CONSULTANT_ID,
        weekStart: WEEK_START,
        timezone: 'UTC',
        tasks: [],
        blocks: [],
        slots: [],
        calendarEntries: [],
        holidays: [],
        version: 1,
        lastCommittedAt: '2026-09-20T00:00:00Z',
        sourceOfLastChange: 'system',
        createdAt: '2026-09-20T00:00:00Z',
        updatedAt: '2026-09-20T00:00:00Z',
        // Gap = 2400 - 600 - BUFFER: plenty of spare time by default
        metadata: { available: 2400, scheduled: 600 },
        ...o,
    } as unknown as WeekContainer;
}

// A dry-run result whose week has the given tasks
const dryRunWith = (tasks: unknown[], ok = true) => ({ ok, value: { tasks } }) as any;

describe('AdvisoryService', () => {
    let service: AdvisoryService;
    let prisma: any;
    let weekService: jest.Mocked<WeekService>;
    let placerService: jest.Mocked<PlacerService>;
    let timeService: jest.Mocked<TimeService>;

    beforeEach(async () => {
        const prismaMock = {
            schedulerIssueDismissal: {
                findMany: jest.fn().mockResolvedValue([]),
                upsert: jest.fn().mockResolvedValue({}),
            },
            schedulerWeek: {
                findUnique: jest.fn().mockResolvedValue(null),
                updateMany: jest.fn().mockReturnValue('week-update'),
            },
            schedulerTask: { findMany: jest.fn().mockResolvedValue([]) },
            schedulerSlotTask: { deleteMany: jest.fn().mockReturnValue('slot-task-delete') },
            schedulerSlot: { deleteMany: jest.fn().mockReturnValue('slot-delete') },
            project: { findUnique: jest.fn().mockResolvedValue({ projectName: 'Data Lake' }) },
            $transaction: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdvisoryService,
                { provide: PrismaService, useValue: prismaMock },
                {
                    provide: WeekService,
                    useValue: {
                        getWeek: jest.fn(),
                        dryRun: jest.fn().mockResolvedValue(dryRunWith([])),
                        commit: jest.fn(),
                    },
                },
                { provide: PlacerService, useValue: { priorityScore: jest.fn().mockReturnValue(0) } },
                {
                    provide: TimeService,
                    useValue: {
                        localDateToInstant: jest.fn((date: string) => `${date}T00:00:00Z` as Instant),
                        workingWindows: jest.fn(workingWindows),
                        localDate: jest.fn((instant: string) => instant.slice(0, 10)),
                    },
                },
            ],
        }).compile();

        service = module.get(AdvisoryService);
        prisma = module.get(PrismaService);
        weekService = module.get(WeekService);
        placerService = module.get(PlacerService);
        timeService = module.get(TimeService);
    });

    afterEach(() => jest.clearAllMocks());

    // -----------------------------------------------------------------
    // buildSuggestions
    // -----------------------------------------------------------------

    describe('buildSuggestions', () => {
        describe('spare capacity', () => {
            it('returns nothing when the gap after the buffer is zero or less', async () => {
                const week = makeWeek({ metadata: { available: 1000, scheduled: 1000 - BUFFER } });

                expect(await service.buildSuggestions(week)).toEqual([]);
                expect(prisma.schedulerIssueDismissal.findMany).not.toHaveBeenCalled();
            });

            it('treats missing metadata numbers as zero', async () => {
                const week = makeWeek({ metadata: {} });

                expect(await service.buildSuggestions(week)).toEqual([]);
            });

            it('uses BUFFER_TARGET_MIN_MINUTES when the rules define it', async () => {
                (SCHEDULER_RULES as any).BUFFER_TARGET_MIN_MINUTES = 60;
                try {
                    // 1000 - 900 - 60 = 40 minutes spare; with the default buffer there would be none
                    const week = makeWeek({ metadata: { available: 1000, scheduled: 900 } });

                    const suggestions = await service.buildSuggestions(week);

                    expect(suggestions).toEqual([{ code: 'REVIEW_CAPACITY', message: 'You have 0h40m of unused capacity this week.' }]);
                } finally {
                    delete (SCHEDULER_RULES as any).BUFFER_TARGET_MIN_MINUTES;
                }
            });
        });

        describe('dismissals', () => {
            it('loads dismissals for this week only', async () => {
                await service.buildSuggestions(makeWeek());

                expect(prisma.schedulerIssueDismissal.findMany).toHaveBeenCalledWith({ where: { weekId: WEEK_ID } });
            });

            it('returns nothing at all when the whole card (UNDERUTILISED) was dismissed', async () => {
                prisma.schedulerIssueDismissal.findMany.mockResolvedValue([{ code: 'UNDERUTILISED' }]);
                const week = makeWeek({ tasks: [{ id: 't1', placement: 'unplaced' }] });

                expect(await service.buildSuggestions(week)).toEqual([]);
                expect(weekService.dryRun).not.toHaveBeenCalled();
            });

            it('skips every dismissed suggestion code', async () => {
                prisma.schedulerIssueDismissal.findMany.mockResolvedValue([
                    { code: 'PLACE_UNPLACED' }, { code: 'PULL_FORWARD' }, { code: 'EXTEND_BLOCK' }, { code: 'REVIEW_CAPACITY' },
                ]);
                const week = makeWeek({ tasks: [{ id: 't1', placement: 'unplaced' }] });

                expect(await service.buildSuggestions(week)).toEqual([]);
                expect(weekService.dryRun).not.toHaveBeenCalled();
                expect(prisma.schedulerWeek.findUnique).not.toHaveBeenCalled();
            });
        });

        describe('REVIEW_CAPACITY', () => {
            it('is the fallback when nothing else applies, with the spare time in hours and minutes', async () => {
                const gap = 2400 - 600 - BUFFER;

                const suggestions = await service.buildSuggestions(makeWeek());

                expect(suggestions).toEqual([{
                    code: 'REVIEW_CAPACITY',
                    message: `You have ${Math.floor(gap / 60)}h${gap % 60}m of unused capacity this week.`,
                }]);
            });

            it('is left out when another suggestion was found', async () => {
                const week = makeWeek({ tasks: [{ id: 't1', placement: 'unplaced' }] });
                weekService.dryRun.mockResolvedValueOnce(dryRunWith([{ id: 't1', placement: 'placed' }]));

                const codes = (await service.buildSuggestions(week)).map((s) => s.code);

                expect(codes).toEqual(['PLACE_UNPLACED']);
            });
        });

        describe('PLACE_UNPLACED', () => {
            it('is suggested when a replan dry run would place at least one unplaced task', async () => {
                const week = makeWeek({
                    tasks: [{ id: 't1', placement: 'unplaced' }, { id: 't2', placement: 'unplaced' }, { id: 't3', placement: 'placed' }],
                });
                weekService.dryRun.mockResolvedValueOnce(dryRunWith([
                    { id: 't1', placement: 'placed' }, { id: 't2', placement: 'unplaced' }, { id: 't3', placement: 'placed' },
                ]));

                const [suggestion] = await service.buildSuggestions(week);

                expect(weekService.dryRun).toHaveBeenCalledWith(WEEK_ID, {
                    type: 'replan',
                    window: { start: '2026-09-21T00:00:00Z', end: '2026-09-28T00:00:00Z' },
                });
                expect(suggestion).toEqual({
                    code: 'PLACE_UNPLACED',
                    message: 'You have 2 unplaced task(s) and available capacity.',
                    action: { type: 'place_unplaced', taskIds: ['t1', 't2'] },
                });
            });

            it('is not suggested when the dry run reports violations', async () => {
                const week = makeWeek({ tasks: [{ id: 't1', placement: 'unplaced' }] });
                weekService.dryRun.mockResolvedValueOnce(dryRunWith([{ id: 't1', placement: 'placed' }], false));

                const codes = (await service.buildSuggestions(week)).map((s) => s.code);

                expect(codes).not.toContain('PLACE_UNPLACED');
            });

            it('is not suggested when a replan would place nothing new', async () => {
                const week = makeWeek({ tasks: [{ id: 't1', placement: 'unplaced' }] });
                weekService.dryRun.mockResolvedValueOnce(dryRunWith([{ id: 't1', placement: 'unplaced' }]));

                const codes = (await service.buildSuggestions(week)).map((s) => s.code);

                expect(codes).not.toContain('PLACE_UNPLACED');
            });

            it('does not run a dry run when nothing is unplaced', async () => {
                await service.buildSuggestions(makeWeek({ tasks: [{ id: 't1', placement: 'placed' }] }));

                expect(weekService.dryRun).not.toHaveBeenCalled();
            });
        });

        describe('PULL_FORWARD', () => {
            const nextWeek = (tasks: unknown[]) => ({ id: 'week-2', tasks });

            it('looks next week up by consultant and a Date week start', async () => {
                await service.buildSuggestions(makeWeek());

                expect(prisma.schedulerWeek.findUnique).toHaveBeenCalledWith({
                    where: { consultantId_weekStart: { consultantId: CONSULTANT_ID, weekStart: new Date('2026-09-28T00:00:00Z') } },
                    include: { tasks: true },
                });
            });

            it('is suggested for Ready tasks from next week that fit and would all be placed', async () => {
                prisma.schedulerWeek.findUnique.mockResolvedValue(nextWeek([
                    { id: 'n1', status: 'Ready', tMax: 120 },
                    { id: 'n2', status: 'Ready', tMax: 60 },
                    { id: 'n3', status: 'InProgress', tMax: 60 },
                ]));
                placerService.priorityScore.mockImplementation((t: any) => (t.id === 'n2' ? 0.9 : 0.1));
                weekService.dryRun.mockResolvedValueOnce(dryRunWith([
                    { id: 'n1', placement: 'placed' }, { id: 'n2', placement: 'placed' },
                ]));

                const [suggestion] = await service.buildSuggestions(makeWeek());

                // Most important first: n2 before n1; the in-progress task is never pulled
                expect(suggestion).toEqual({
                    code: 'PULL_FORWARD',
                    message: 'You have capacity to pull forward 2 task(s) from next week.',
                    action: { type: 'pull_forward', taskIds: ['n2', 'n1'] },
                });
                expect(weekService.dryRun).toHaveBeenCalledWith(WEEK_ID, expect.objectContaining({
                    type: 'pull_forward',
                    taskIds: ['n2', 'n1'],
                    origin: 'system',
                    tasks: [expect.objectContaining({ id: 'n2' }), expect.objectContaining({ id: 'n1' })],
                }));
            });

            it('skips tasks that would not fit in the spare time', async () => {
                const gap = 2400 - 600 - BUFFER;
                prisma.schedulerWeek.findUnique.mockResolvedValue(nextWeek([
                    { id: 'huge', status: 'Ready', tMax: gap + 1 },
                    { id: 'small', status: 'Ready', tMax: 60 },
                ]));
                weekService.dryRun.mockResolvedValueOnce(dryRunWith([{ id: 'small', placement: 'placed' }]));

                const [suggestion] = await service.buildSuggestions(makeWeek());

                expect(suggestion.action.taskIds).toEqual(['small']);
            });

            it('is not suggested when next week does not exist yet', async () => {
                prisma.schedulerWeek.findUnique.mockResolvedValue(null);

                const codes = (await service.buildSuggestions(makeWeek())).map((s) => s.code);

                expect(codes).toEqual(['REVIEW_CAPACITY']);
            });

            it('is not suggested when no Ready task fits', async () => {
                prisma.schedulerWeek.findUnique.mockResolvedValue(nextWeek([{ id: 'n1', status: 'Done', tMax: 60 }]));

                const codes = (await service.buildSuggestions(makeWeek())).map((s) => s.code);

                expect(codes).toEqual(['REVIEW_CAPACITY']);
                expect(weekService.dryRun).not.toHaveBeenCalled();
            });

            it('is not suggested when the dry run reports violations', async () => {
                prisma.schedulerWeek.findUnique.mockResolvedValue(nextWeek([{ id: 'n1', status: 'Ready', tMax: 60 }]));
                weekService.dryRun.mockResolvedValueOnce(dryRunWith([{ id: 'n1', placement: 'placed' }], false));

                const codes = (await service.buildSuggestions(makeWeek())).map((s) => s.code);

                expect(codes).not.toContain('PULL_FORWARD');
            });

            it('is not suggested when a pulled task would not actually be placed', async () => {
                prisma.schedulerWeek.findUnique.mockResolvedValue(nextWeek([
                    { id: 'n1', status: 'Ready', tMax: 60 },
                    { id: 'n2', status: 'Ready', tMax: 60 },
                ]));
                // n1 stays unplaced and n2 is missing from the result entirely
                weekService.dryRun.mockResolvedValueOnce(dryRunWith([{ id: 'n1', placement: 'unplaced' }]));

                const codes = (await service.buildSuggestions(makeWeek())).map((s) => s.code);

                expect(codes).not.toContain('PULL_FORWARD');
            });
        });

        describe('EXTEND_BLOCK', () => {
            // Only EXTEND_BLOCK is left to check in these tests
            beforeEach(() => {
                prisma.schedulerIssueDismissal.findMany.mockResolvedValue([{ code: 'PLACE_UNPLACED' }, { code: 'PULL_FORWARD' }]);
            });

            const unplacedFor = (projectId: string) => ({ id: `u-${projectId}`, projectId, placement: 'unplaced' });

            it('extends a block to the end of its working day and names the project and day', async () => {
                const week = makeWeek({
                    blocks: [{ id: 'b1', projectId: 'p1', mobility: 'fluid', start: at(0, '07:00'), end: at(0, '11:00') }],
                    tasks: [unplacedFor('p1')],
                });
                weekService.dryRun.mockResolvedValueOnce(dryRunWith([]));

                const [suggestion] = await service.buildSuggestions(week);

                expect(weekService.dryRun).toHaveBeenCalledWith(WEEK_ID, expect.objectContaining({
                    type: 'resize_block',
                    blockId: 'b1',
                    to: { start: at(0, '07:00'), end: at(0, '16:00') },
                    origin: 'system',
                }));
                expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { id: 'p1' }, select: { projectName: true } });
                expect(suggestion).toEqual({
                    code: 'EXTEND_BLOCK',
                    message: "Extending Data Lake's block on Monday could fit more of its waiting work in this week.",
                    action: { type: 'resize_block', blockId: 'b1', to: { start: at(0, '07:00'), end: at(0, '16:00') } },
                });
            });

            it('falls back to a generic name when the project is not found', async () => {
                prisma.project.findUnique.mockResolvedValueOnce(null);
                const week = makeWeek({
                    blocks: [{ id: 'b1', projectId: 'p1', mobility: 'fluid', start: at(0, '07:00'), end: at(0, '11:00') }],
                    tasks: [unplacedFor('p1')],
                });

                const [suggestion] = await service.buildSuggestions(week);

                expect(suggestion.message).toContain("Extending this project's block");
            });

            it('never extends into the next block on the same day', async () => {
                const week = makeWeek({
                    blocks: [
                        { id: 'b1', projectId: 'p1', mobility: 'fluid', start: at(0, '07:00'), end: at(0, '10:00') },
                        { id: 'later', projectId: 'p2', mobility: 'fluid', start: at(0, '12:00'), end: at(0, '16:00') },
                        { id: 'earlier', projectId: 'p2', mobility: 'fluid', start: at(0, '06:00'), end: at(0, '07:00') },
                    ],
                    tasks: [unplacedFor('p1')],
                });

                const [suggestion] = await service.buildSuggestions(week);

                expect(suggestion.action.to.end).toBe(at(0, '12:00'));
            });

            it('extends by no more than the spare time', async () => {
                // Gap of 30 minutes: 1000 - (1000 - BUFFER - 30) - BUFFER
                const week = makeWeek({
                    metadata: { available: 1000, scheduled: 1000 - BUFFER - 30 },
                    blocks: [{ id: 'b1', projectId: 'p1', mobility: 'fluid', start: at(0, '07:00'), end: at(0, '11:00') }],
                    tasks: [unplacedFor('p1')],
                });

                const [suggestion] = await service.buildSuggestions(week);

                expect(suggestion.action.to.end).toBe(at(0, '11:30'));
            });

            it('skips pinned blocks and projects with nothing unplaced', async () => {
                const week = makeWeek({
                    blocks: [
                        { id: 'pinned', projectId: 'p1', mobility: 'pinned', start: at(0, '07:00'), end: at(0, '10:00') },
                        { id: 'idle', projectId: 'p2', mobility: 'fluid', start: at(1, '07:00'), end: at(1, '10:00') },
                    ],
                    tasks: [unplacedFor('p1'), { id: 'placed', projectId: 'p2', placement: 'placed' }],
                });

                const codes = (await service.buildSuggestions(week)).map((s) => s.code);

                expect(codes).toEqual(['REVIEW_CAPACITY']);
                expect(weekService.dryRun).not.toHaveBeenCalled();
            });

            it('skips a block that already reaches the end of its day', async () => {
                const week = makeWeek({
                    blocks: [{ id: 'b1', projectId: 'p1', mobility: 'fluid', start: at(0, '07:00'), end: at(0, '16:00') }],
                    tasks: [unplacedFor('p1')],
                });

                await service.buildSuggestions(week);

                expect(weekService.dryRun).not.toHaveBeenCalled();
            });

            it('skips a block on a day with no working hours', async () => {
                timeService.workingWindows.mockReturnValue([]);
                const week = makeWeek({
                    blocks: [{ id: 'b1', projectId: 'p1', mobility: 'fluid', start: at(5, '07:00'), end: at(5, '10:00') }],
                    tasks: [unplacedFor('p1')],
                });

                await service.buildSuggestions(week);

                expect(weekService.dryRun).not.toHaveBeenCalled();
            });

            it('tries the next block when an extension would not place anything', async () => {
                const week = makeWeek({
                    blocks: [
                        { id: 'b1', projectId: 'p1', mobility: 'fluid', start: at(0, '07:00'), end: at(0, '11:00') },
                        { id: 'b2', projectId: 'p1', mobility: 'fluid', start: at(1, '07:00'), end: at(1, '11:00') },
                    ],
                    tasks: [unplacedFor('p1')],
                });
                weekService.dryRun
                    .mockResolvedValueOnce(dryRunWith([unplacedFor('p1')]))       // b1: still unplaced
                    .mockResolvedValueOnce(dryRunWith([], false))                // b2: violation
                ;

                const codes = (await service.buildSuggestions(week)).map((s) => s.code);

                expect(weekService.dryRun).toHaveBeenCalledTimes(2);
                expect(codes).toEqual(['REVIEW_CAPACITY']);
            });
        });
    });

    // -----------------------------------------------------------------
    // pullForward
    // -----------------------------------------------------------------

    describe('pullForward', () => {
        const thisWeekDb = { id: WEEK_ID, consultantId: CONSULTANT_ID, weekStart: new Date('2026-09-21T00:00:00Z') };
        const liveWeek = makeWeek();

        const futureTask = (o: Record<string, unknown> = {}) => ({
            id: 'task-1',
            weekId: 'week-next',
            status: 'Ready',
            placement: 'placed',
            unplacedReason: 'CONTAINER_FULL',
            subtasks: [{ id: 's1', title: 'Sub', done: false }],
            week: { consultantId: CONSULTANT_ID, weekStart: new Date('2026-09-28T00:00:00Z') },
            ...o,
        });

        beforeEach(() => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(thisWeekDb);
            weekService.getWeek.mockResolvedValue(liveWeek);
            weekService.commit.mockResolvedValue({ ok: true, value: liveWeek } as any);
        });

        it('rejects an empty task list', async () => {
            await expect(service.pullForward(WEEK_ID, [])).rejects.toThrow(BadRequestException);
        });

        it('rejects an unknown week', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(null);

            await expect(service.pullForward('nope', ['task-1'])).rejects.toThrow(NotFoundException);
        });

        it('lists the task ids it could not find', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([futureTask()]);

            await expect(service.pullForward(WEEK_ID, ['task-1', 'task-2'])).rejects.toThrow('Task(s) not found: task-2');
        });

        it('refuses tasks that belong to another consultant', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                futureTask({ week: { consultantId: 'someone-else', weekStart: new Date('2026-09-28T00:00:00Z') } }),
            ]);

            await expect(service.pullForward(WEEK_ID, ['task-1'])).rejects.toThrow(ForbiddenException);
        });

        it('refuses tasks that are not in a future week', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                futureTask({ week: { consultantId: CONSULTANT_ID, weekStart: new Date('2026-09-21T00:00:00Z') } }),
            ]);

            await expect(service.pullForward(WEEK_ID, ['task-1'])).rejects.toThrow('is not in a future week');
        });

        it('refuses tasks that have already been started', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([futureTask({ status: 'InProgress' })]);

            await expect(service.pullForward(WEEK_ID, ['task-1'])).rejects.toThrow("has already been started and can't be moved");
        });

        it('loads the week and the tasks with their subtasks', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([futureTask()]);

            await service.pullForward(WEEK_ID, ['task-1'], 4);

            expect(weekService.getWeek).toHaveBeenCalledWith(CONSULTANT_ID, '2026-09-21');
            expect(prisma.schedulerTask.findMany).toHaveBeenCalledWith({
                where: { id: { in: ['task-1'] } },
                include: { week: true, subtasks: true },
            });
        });

        it('re-homes the tasks to this week and commits a pull_forward change', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([futureTask()]);

            const result = await service.pullForward(WEEK_ID, ['task-1'], 4);

            expect(result.ok).toBe(true);
            const [week, change, ctx, version] = weekService.commit.mock.calls[0];
            expect(week).toBe(liveWeek);
            expect(version).toBe(4);
            expect(ctx).toEqual({ bumpedEntityIds: [], allocations: [] });
            expect(change).toMatchObject({
                type: 'pull_forward',
                taskIds: ['task-1'],
                origin: 'user',
                window: { start: '2026-09-21T00:00:00Z', end: '2026-09-28T00:00:00Z' },
            });

            const [moved] = (change as any).tasks;
            expect(moved).toMatchObject({ id: 'task-1', weekId: WEEK_ID, placement: 'unplaced', subtasks: [{ id: 's1' }] });
            expect(moved.unplacedReason).toBeUndefined();
            expect(moved.unplacedNeededMinutes).toBeUndefined();
            expect(moved.unplacedAvailableMinutes).toBeUndefined();
            expect(moved).not.toHaveProperty('week');
        });

        it('clears the old slots and bumps the version of each source week once', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                futureTask(),
                futureTask({ id: 'task-2' }),
            ]);

            await service.pullForward(WEEK_ID, ['task-1', 'task-2']);

            expect(prisma.schedulerSlotTask.deleteMany).toHaveBeenCalledWith({
                where: { taskId: { in: ['task-1', 'task-2'] }, slot: { weekId: { in: ['week-next'] } } },
            });
            expect(prisma.schedulerSlot.deleteMany).toHaveBeenCalledWith({
                where: { weekId: { in: ['week-next'] }, slotTasks: { none: {} } },
            });
            expect(prisma.schedulerWeek.updateMany).toHaveBeenCalledWith({
                where: { id: { in: ['week-next'] } },
                data: { version: { increment: 1 } },
            });
            // Unlink first, then delete empty slots, then bump versions
            expect(prisma.$transaction).toHaveBeenCalledWith(['slot-task-delete', 'slot-delete', 'week-update']);
        });

        it('leaves the source week alone when the commit is rejected', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([futureTask()]);
            weekService.commit.mockResolvedValue({ ok: false, value: liveWeek } as any);

            const result = await service.pullForward(WEEK_ID, ['task-1']);

            expect(result.ok).toBe(false);
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------
    // dismiss
    // -----------------------------------------------------------------

    describe('dismiss', () => {
        it('records the dismissal, and repeating it is harmless (upsert)', async () => {
            await service.dismiss(WEEK_ID, 'REVIEW_CAPACITY');

            expect(prisma.schedulerIssueDismissal.upsert).toHaveBeenCalledWith({
                where: { weekId_code: { weekId: WEEK_ID, code: 'REVIEW_CAPACITY' } },
                update: { dismissedAt: expect.any(Date) },
                create: { weekId: WEEK_ID, code: 'REVIEW_CAPACITY', dismissedAt: expect.any(Date) },
            });
        });

        it('refuses to dismiss persistent issues', async () => {
            await expect(service.dismiss(WEEK_ID, 'CONTAINERS_EXCEED_CONTRACT')).rejects.toThrow(BadRequestException);
            expect(prisma.schedulerIssueDismissal.upsert).not.toHaveBeenCalled();
        });
    });
});