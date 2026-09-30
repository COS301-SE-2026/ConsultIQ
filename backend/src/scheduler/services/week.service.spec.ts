import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WeekService } from './week.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeService, LocalDate, Instant } from './time.service';
import { HolidayService } from './holiday.service';
import { PlacerService } from './placer.service';
import { ValidatorService } from './validator.service';
import { WeekContainer, Change, Task, ProjectBlock, Slot, ValidateContext, Interval, CalendarEntryDto, CalendarEntry } from '../dto/scheduler.dto';

describe('WeekService', () => {
    let service: WeekService;
    let prisma: PrismaService;
    let placerService: PlacerService;
    let validatorService: ValidatorService;
    const mockWindow: Interval = { start: '2026-09-28T00:00:00Z', end: '2026-09-29T00:00:00Z' };

    const mockDate = new Date('2026-09-25T00:00:00Z');

    const mockPrisma = {
        schedulerWeek: {
            findUnique: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        },
        schedulerSlot: {
            deleteMany: jest.fn(),
            create: jest.fn(),
        },
        schedulerSlotTask: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
        },
        schedulerTask: {
            deleteMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            upsert: jest.fn(),
        },
        schedulerProjectBlock: {
            update: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        schedulerSubtask: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
        },
        schedulerCalendarEntry: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
        },

        projectPlacement: {
            findMany: jest.fn().mockResolvedValue([]),
        },

        $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
    };

    const mockTimeService = {
        localDateToInstant: jest.fn().mockReturnValue('2026-09-25T00:00:00Z'),
    };

    const mockHolidayService = {
        getForWeek: jest.fn().mockResolvedValue([]),
    };

    const mockPlacerService = {
        blockMinutes: jest.fn().mockReturnValue(120),
        place: jest.fn(),
    };

    const mockValidatorService = {
        summarize: jest.fn().mockReturnValue({}),
        validate: jest.fn().mockReturnValue({ issues: [] }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WeekService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: TimeService, useValue: mockTimeService },
                { provide: HolidayService, useValue: mockHolidayService },
                { provide: PlacerService, useValue: mockPlacerService },
                { provide: ValidatorService, useValue: mockValidatorService },
            ],
        }).compile();

        service = module.get(WeekService);
        prisma = module.get(PrismaService);
        placerService = module.get(PlacerService);
        validatorService = module.get(ValidatorService);

        jest.clearAllMocks();
    });

    describe('getWeek & resolveBlocks', () => {
        it('initializes and returns a new week if it does not exist', async () => {
            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce(null);
            const newDbWeek = {
                id: 'W-NEW', consultantId: 'C1', timezone: 'UTC', weekStart: mockDate,
                version: 1, createdAt: mockDate, updatedAt: mockDate, lastCommittedAt: mockDate,
                sourceOfLastChange: 'system', tasks: [], calendarEntries: [], slots: [], blocks: [],
            };
            mockPrisma.schedulerWeek.create.mockResolvedValueOnce(newDbWeek);

            const result = await service.getWeek('C1', '2026-09-25' as LocalDate);

            expect(mockPrisma.schedulerWeek.create).toHaveBeenCalled();
            expect(result.id).toBe('W-NEW');
        });

        it('assembles and returns a valid WeekContainer with resolved blocks', async () => {
            const dbWeek = {
                id: 'W1', consultantId: 'C1', timezone: 'UTC', weekStart: mockDate,
                version: 1, createdAt: mockDate, updatedAt: mockDate, lastCommittedAt: null,
                sourceOfLastChange: null, tasks: [], calendarEntries: [], slots: [],
                blocks: [
                    { id: 'B1', userSized: true },
                    { id: 'B2', allocation: null },
                    { id: 'B3', allocation: { target: 100 } }
                ],
            };
            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce(dbWeek);

            const result = await service.getWeek('C1', '2026-09-25' as LocalDate);

            expect(result.blocks).toHaveLength(3);
            expect(placerService.blockMinutes).toHaveBeenCalledTimes(1);
        });
    });

    describe('commit pipeline & persistWeek', () => {
        let mockWeek: WeekContainer;
        let mockChange: Change;
        let mockCtx: ValidateContext;

        beforeEach(() => {
            mockWeek = {
                id: 'W1', consultantId: 'C1', weekStart: '2026-09-25' as LocalDate, version: 2, timezone: 'UTC',
                tasks: [
                    { id: 'T1', status: 'Ready' } as Task,
                    { id: 'T2', status: 'Done' } as Task
                ],
                blocks: [
                    { id: 'B1', userSized: true } as unknown as ProjectBlock,
                    { id: 'B2', userSized: false } as unknown as ProjectBlock
                ],
                slots: [
                    { id: 'S1', taskIds: ['T1'] } as unknown as Slot,
                    { id: 'S2', taskIds: [] } as unknown as Slot
                ],
                calendarEntries: [
                    { id: 'CE1', type: 'ad-hoc', origin: 'public-holiday', start: '2026-09-25T00:00:00Z', end: '2026-09-25T01:00:00Z' } as any,
                    { id: 'CE2', type: 'meeting', origin: 'user', start: '2026-09-25T00:00:00Z', end: '2026-09-25T01:00:00Z' } as any
                ],
                holidays: [], metadata: {} as any, createdAt: mockDate.toISOString() as Instant,
                updatedAt: mockDate.toISOString() as Instant, lastCommittedAt: mockDate.toISOString() as Instant, sourceOfLastChange: 'system',
            };
            mockChange = { type: 'replan', window: { start: 'A' as Instant, end: 'B' as Instant } };
            mockCtx = { bumpedEntityIds: [], allocations: [] };
        });

        it('returns VERSION_CONFLICT if expectedVersion does not match current', async () => {
            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce({
                ...mockWeek,
                weekStart: mockDate,
                createdAt: mockDate,
                updatedAt: mockDate,
                lastCommittedAt: mockDate
            });
            const result = await service.commit(mockWeek, mockChange, mockCtx, 1);
            expect(result.ok).toBe(false);
            expect(result.violations[0].code).toBe('VERSION_CONFLICT');
        });

        it('returns early without persisting if validation yields violations', async () => {
            mockValidatorService.validate.mockReturnValueOnce({ issues: [{ level: 'violation', message: 'Bad state', code: 'CONTAINER_FULL' }] });
            const result = await service.commit(mockWeek, mockChange, mockCtx, 2);
            expect(result.ok).toBe(false);
        });

        it('does not persist if dryRun is true', async () => {
            const result = await service.commit(mockWeek, mockChange, mockCtx, 2, { dryRun: true });
            expect(result.ok).toBe(true);
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('successfully persists, hitting all branches in persistWeek (creates, updates, enums mappings)', async () => {
            const result = await service.commit(mockWeek, mockChange, mockCtx, 2);

            expect(result.ok).toBe(true);
            expect(prisma.$transaction).toHaveBeenCalled();
            expect(mockPrisma.schedulerWeek.update).toHaveBeenCalledWith({
                where: { id: 'W1', version: 2 },
                data: expect.objectContaining({ version: { increment: 1 } })
            });

            expect(mockPrisma.schedulerCalendarEntry.createMany).toHaveBeenCalledWith({
                data: expect.arrayContaining([
                    expect.objectContaining({ type: 'ad_hoc', origin: 'public_holiday' }),
                    expect.objectContaining({ type: 'meeting', origin: 'user' })
                ])
            });

            expect(mockPrisma.schedulerTask.upsert).toHaveBeenCalled();
            expect(mockPrisma.schedulerProjectBlock.update).toHaveBeenCalledTimes(1);
            expect(mockPrisma.schedulerSlotTask.createMany).toHaveBeenCalledTimes(1);
        });

        it('persists safely if calendar entries or slots are empty (omitting version fallback)', async () => {
            mockWeek.calendarEntries = undefined as any;
            mockWeek.slots = [];
            const result = await service.commit(mockWeek, mockChange, mockCtx);

            expect(result.ok).toBe(true);
            expect(mockPrisma.schedulerWeek.update).toHaveBeenCalledWith({
                where: { id: 'W1' },
                data: expect.objectContaining({ version: { increment: 1 } })
            });
            expect(mockPrisma.schedulerCalendarEntry.createMany).not.toHaveBeenCalled();
        });

        it('catches Prisma P2025 and returns VERSION_CONFLICT on atomic persist failure', async () => {
            mockPrisma.$transaction.mockRejectedValueOnce({ code: 'P2025' });
            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce({
                ...mockWeek,
                weekStart: mockDate,
                createdAt: mockDate,
                updatedAt: mockDate,
                lastCommittedAt: mockDate
            });
            const result = await service.commit(mockWeek, mockChange, mockCtx, 2);
            expect(result.ok).toBe(false);
            expect(result.violations[0].code).toBe('VERSION_CONFLICT');
        });
        it('bubbles up non-P2025 database errors', async () => {
            mockPrisma.$transaction.mockRejectedValueOnce(new Error('DB Down'));
            await expect(service.commit(mockWeek, mockChange, mockCtx, 2)).rejects.toThrow('DB Down');
        });
    });

    describe('applyChange branches', () => {
        let mockWeek: WeekContainer;

        beforeEach(() => {
            mockWeek = {
                id: 'W1',
                tasks: [{ id: 'task-1', tMin: 60, tMax: 120, status: 'Ready', subtasks: [{ id: 'sub-1', done: false }, { id: 'sub-2', done: true }] }],
                blocks: [],
                slots: [{ id: 'slot-1', taskIds: ['task-1'] }],
                calendarEntries: [{ id: 'ce-1', type: 'meeting' }],
            } as unknown as WeekContainer;
        });

        it('handles update_task (found and not found)', () => {
            service['applyChange'](mockWeek, { type: 'update_task', taskId: 'task-1', patch: { status: 'InProgress' } as any, origin: 'user', window: mockWindow });
            expect(mockWeek.tasks[0].status).toBe('InProgress');

            service['applyChange'](mockWeek, { type: 'update_task', taskId: 'bad-id', patch: { status: 'Done' } as any, origin: 'user', window: mockWindow });
            expect(mockWeek.tasks).toHaveLength(1);
        });

        it('handles set_status (found and not found)', () => {
            service['applyChange'](mockWeek, { type: 'set_status', taskId: 'task-1', status: 'Done', origin: 'system', window: mockWindow });
            expect(mockWeek.tasks[0].status).toBe('Done');

            service['applyChange'](mockWeek, { type: 'set_status', taskId: 'bad-id', status: 'Done', origin: 'system', window: mockWindow });
        });

        it('handles toggle_subtask (various branches)', () => {
            service['applyChange'](mockWeek, { type: 'toggle_subtask', taskId: 'bad', subtaskId: 'sub-1', origin: 'user', window: mockWindow });

            service['applyChange'](mockWeek, { type: 'toggle_subtask', taskId: 'task-1', subtaskId: 'bad', origin: 'user', window: mockWindow });

            service['applyChange'](mockWeek, { type: 'toggle_subtask', taskId: 'task-1', subtaskId: 'sub-1', origin: 'user', window: mockWindow });
            expect((mockWeek.tasks[0] as any).subtasks[0].done).toBe(true);
            expect(mockWeek.tasks[0].status).toBe('Done');
            expect((mockWeek.tasks[0] as any).subtasks.every((subtask: any) => subtask.done)).toBe(true);
        });

        it('handles split_task (found and not found)', () => {
            service['applyChange'](mockWeek, { type: 'split_task', taskId: 'bad-id', atMinutes: 90, origin: 'user', window: mockWindow });
            mockWeek.tasks[0].tMax = 120;
            mockWeek.tasks[0].subtasks = [
                { id: 'sub-1', title: 'First half', estimate: 60, done: false },
                { id: 'sub-2', title: 'Second half', estimate: 60, done: false },
            ] as any;
            service['applyChange'](mockWeek, { type: 'split_task', taskId: 'task-1', atMinutes: 60, origin: 'user', window: mockWindow });
            expect(mockWeek.tasks).toHaveLength(2);
            expect(mockWeek.tasks[0].tMax).toBe(60);
            expect(mockWeek.tasks[0].subtasks).toHaveLength(1);
            expect(mockWeek.tasks[1].tMax).toBe(60);
            expect(mockWeek.tasks[1].subtasks).toHaveLength(1);
        });

        it('handles accept_deadline_miss (found and not found)', () => {
            service['applyChange'](mockWeek, { type: 'accept_deadline_miss', taskId: 'bad-id', origin: 'user', window: mockWindow });

            mockWeek.tasks[0].unplacedReason = 'DEADLINE_INFEASIBLE' as any;
            service['applyChange'](mockWeek, { type: 'accept_deadline_miss', taskId: 'task-1', origin: 'user', window: mockWindow });
            expect(mockWeek.tasks[0].deadlineMissAccepted).toBe(true);
        });

        it('handles calendar_upsert (existing and new)', () => {
            const newDto = { id: 'ce-new' } as CalendarEntryDto;
            service['applyChange'](mockWeek, { type: 'calendar_upsert', entry: newDto, origin: 'user', window: mockWindow });
            expect(mockWeek.calendarEntries).toHaveLength(2);

            const existDto = { id: 'ce-1', type: 'travel' } as CalendarEntryDto;
            service['applyChange'](mockWeek, { type: 'calendar_upsert', entry: existDto, origin: 'user', window: mockWindow });
            expect(mockWeek.calendarEntries[0].type).toBe('travel');
        });

        it('handles calendar_remove', () => {
            service['applyChange'](mockWeek, { type: 'calendar_remove', entryId: 'ce-1', origin: 'user', window: mockWindow });
            expect(mockWeek.calendarEntries).toHaveLength(0);
        });

        it('handles pull_forward (with and without tasks)', () => {
            service['applyChange'](mockWeek, { type: 'pull_forward', taskIds: [], tasks: undefined as any, origin: 'system', window: mockWindow }); // falsy tasks array branch
            service['applyChange'](mockWeek, { type: 'pull_forward', taskIds: [], tasks: [{ id: 't2' } as Task], origin: 'system', window: mockWindow }); // truthy tasks array branch
            expect(mockWeek.tasks).toHaveLength(2);
        });


        it('handles mark_incomplete (reverts status and last completed subtask)', () => {
            // Set task to Done and sub-2 to done
            mockWeek.tasks[0].status = 'Done';
            (mockWeek.tasks[0] as any).subtasks[1].done = true;

            const res = service['applyChange'](mockWeek, {
                type: 'mark_incomplete',
                taskId: 'task-1',
                origin: 'system',
                window: mockWindow
            });

            expect(res).toEqual(mockWindow);
            expect(mockWeek.tasks[0].status).toBe('InProgress');
            expect((mockWeek.tasks[0] as any).subtasks[1].done).toBe(false);
        });


        it('handles rollover action correctly', () => {
            const res1 = service['applyChange'](mockWeek, {
                type: 'rollover',
                taskId: 'task-1',
                fromSlotId: 'slot-1',
                origin: 'system',
                window: mockWindow
            });
            expect(res1).toEqual(mockWindow);
            expect(mockWeek.tasks[0].placement).toBe('unplaced');
            expect(mockWeek.tasks[0].carriedOver).toBe(true);
        });

        it('handles create_task', () => {
            const initialLen = mockWeek.tasks.length;
            service['applyChange'](mockWeek, { type: 'create_task', task: { id: 'new-t' } as any, origin: 'user', window: mockWindow });


            expect(mockWeek.tasks).toHaveLength(initialLen + 1);
        });

        it('handles delete_task', () => {
            mockWeek.tasks = [{ id: 'task-1' } as any];
            service['applyChange'](mockWeek, { type: 'delete_task', taskId: 'task-1', origin: 'user', window: mockWindow });


            expect(mockWeek.tasks).toHaveLength(0);
        });

        it('handles place_unplaced', () => {
            const res = service['applyChange'](mockWeek, { type: 'place_unplaced', taskIds: [], origin: 'user', window: mockWindow });


            expect(res).toEqual(mockWindow);
        });

        it('handles move_slot and locks the moved slot', () => {
            mockWeek.slots = [{ id: 'slot-1', taskIds: [], start: 'A', end: 'B', locked: false } as any];

            service['applyChange'](mockWeek, {
                type: 'move_slot',
                slotId: 'slot-1',
                to: { start: 'C', end: 'D' },
                tags: ['extended-hours'],
                origin: 'user',
                window: mockWindow,
            });

            expect(mockWeek.slots[0]).toEqual(expect.objectContaining({
                start: 'C',
                end: 'D',
                locked: true,
                tags: ['extended-hours'],
            }));
        });

        it('rejects an unknown change type', () => {
            expect(() => service['applyChange'](mockWeek, { type: 'unknown-change' } as any))
                .toThrow(/unhandled change type/);
        });

        it('rejects splitting when a subtask has no estimate', () => {
            mockWeek.tasks[0].subtasks = [{ id: 'sub-1', title: 'Missing estimate', done: false }] as any;

            expect(() => service['applyChange'](mockWeek, {
                type: 'split_task',
                taskId: 'task-1',
                atMinutes: 60,
                origin: 'user',
                window: mockWindow,
            })).toThrow(/needs an estimate/);
        });

        it('rejects splitting through the middle of a subtask', () => {
            mockWeek.tasks[0].subtasks = [{ id: 'sub-1', title: 'Long subtask', estimate: 90, done: false }] as any;

            expect(() => service['applyChange'](mockWeek, {
                type: 'split_task',
                taskId: 'task-1',
                atMinutes: 60,
                origin: 'user',
                window: mockWindow,
            })).toThrow(/Split point falls inside subtask/);
        });

        it('handles move_block', () => {
            mockWeek.blocks = [{ id: 'block-1', start: 'A', end: 'B' } as any];
            service['applyChange'](mockWeek, {
                type: 'move_block',
                blockId: 'block-1',
                to: { start: 'C', end: 'D' },
                origin: 'user',
                window: mockWindow
            });
            expect(mockWeek.blocks[0].start).toBe('C');
            expect(mockWeek.blocks[0].end).toBe('D');
        });

        it('handles resize_block', () => {
            mockWeek.blocks = [{ id: 'block-1', start: 'A', end: 'B', userSized: false } as any];
            service['applyChange'](mockWeek, {
                type: 'resize_block',
                blockId: 'block-1',
                to: { start: 'C', end: 'D' },
                origin: 'user',
                window: mockWindow
            });
            expect(mockWeek.blocks[0].start).toBe('C');
            expect((mockWeek.blocks[0] as any).userSized).toBe(true);
        });

        it('handles pin_block', () => {
            mockWeek.blocks = [{ id: 'block-1', mobility: 'fluid' } as any];
            service['applyChange'](mockWeek, {
                type: 'pin_block',
                blockId: 'block-1',
                pinned: true,
                origin: 'user',
                window: mockWindow
            });
            expect(mockWeek.blocks[0].mobility).toBe('pinned');
        });

        it('handles place_unplaced helper branch', () => {
            mockWeek.tasks = [
                { id: 'task-1', placement: 'placed' },
                { id: 'task-2', placement: 'unplaced' },
                { id: 'task-3', placement: 'unplaced' }
            ] as any;

            service['applyChange'](mockWeek, {
                type: 'place_unplaced',
                taskIds: ['task-2'],
                origin: 'user',
                window: mockWindow
            });
            expect(mockWeek.tasks[2].placement).toBe('placed');
            expect((mockWeek.tasks[2] as any)._tempBlinded).toBe(true);
        });
    });

    describe('Endpoints (replan & dryRun)', () => {
        const mockDbWeek = { id: 'W1', consultantId: 'C1', weekStart: mockDate, timezone: 'UTC', version: 1, createdAt: mockDate, updatedAt: mockDate, tasks: [], calendarEntries: [], slots: [], blocks: [] };

        it('replan fetches week, builds window, and commits', async () => {
            mockPrisma.schedulerWeek.findUnique.mockResolvedValue(mockDbWeek);
            const result = await service.replan('W1', 1);
            expect(result.ok).toBe(true);
        });

        it('dryRun fetches week and commits with dryRun flag', async () => {
            mockPrisma.schedulerWeek.findUnique.mockResolvedValue(mockDbWeek);
            const result = await service.dryRun('W1', { type: 'replan', window: {} as any }, 1);
            expect(result.ok).toBe(true);
        });

        it('throws NotFoundException if getWeekById cannot find week', async () => {
            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce(null);
            await expect(service.replan('INVALID_ID')).rejects.toThrow(NotFoundException);
        });
    });

    describe('Coverage Gap Fillers', () => {

        const createMockWeek = (): WeekContainer => ({
            id: 'W1',
            consultantId: 'C1',
            weekStart: '2026-09-25' as LocalDate,
            version: 2,
            timezone: 'UTC',
            tasks: [{ id: 'T1', status: 'Ready' } as Task],
            blocks: [{ id: 'B1', userSized: true } as unknown as ProjectBlock],
            slots: [{ id: 'S1', taskIds: ['T1'] } as unknown as Slot],
            calendarEntries: [{ id: 'CE1', type: 'meeting', origin: 'user', start: '2026-09-25T00:00:00Z', end: '2026-09-25T01:00:00Z' } as any],
            holidays: [],
            metadata: {} as any,
            createdAt: mockDate.toISOString() as Instant,
            updatedAt: mockDate.toISOString() as Instant,
            lastCommittedAt: mockDate.toISOString() as Instant,
            sourceOfLastChange: 'system',
        });

        it('unblinds temporary blinded tasks after place_unplaced commit', async () => {
            const testWeek = createMockWeek();
            testWeek.version = 1;
            const taskToBlind = { id: 'tb-1', placement: 'unplaced', _tempBlinded: true } as any;
            testWeek.tasks = [taskToBlind];

            const change: Change = {
                type: 'place_unplaced',
                taskIds: [],
                origin: 'user',
                window: mockWindow,
            };

            mockValidatorService.validate.mockReturnValueOnce({ issues: [] });

            const result = await service.commit(testWeek, change, { bumpedEntityIds: [], allocations: [] }, 1, { dryRun: true });

            expect(result.ok).toBe(true);
            const unblindedTask = result.value.tasks.find(t => t.id === 'tb-1');
            expect((unblindedTask as any)._tempBlinded).toBeUndefined();
        });

        it('persists subtask estimates correctly', async () => {
            const testWeek = {
                ...createMockWeek(),
                tasks: [{
                    id: 'T-SUB',
                    projectId: 'P1',
                    title: 'Task with subtasks',
                    tMin: 30,
                    tMax: 60,
                    status: 'Ready',
                    placement: 'placed',
                    subtasks: [{ id: 'sub-1', title: 'Sub 1', done: false, estimate: 30 }]
                } as any],
                slots: [],
                calendarEntries: []
            };

            const change = { type: 'replan', window: mockWindow } as Change;
            const ctx = { bumpedEntityIds: [], allocations: [] };

            const result = await service.commit(testWeek, change, ctx, 2);
            expect(result.ok).toBe(true);
            expect(mockPrisma.schedulerSubtask.createMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.arrayContaining([
                        expect.objectContaining({ estimate: 30 })
                    ])
                })
            );
        });

        it('throws NotFoundException when block is missing in getBlock', () => {
            const badWeek = { blocks: [] } as any;
            expect(() => service['getBlock'](badWeek, 'non-existent-block')).toThrow(NotFoundException);
        });

        it('throws NotFoundException when slot is missing in applyMoveSlot', () => {
            const badWeek = { slots: [] } as any;
            expect(() => service['applyMoveSlot'](badWeek, 'non-existent-slot', mockWindow)).toThrow(NotFoundException);
        });

        it('generates missing IDs for tasks and subtasks during applyChange (create_task & pull_forward)', () => {
            const testWeek = createMockWeek();


            const newTask = {
                title: 'New Task',
                subtasks: [{ title: 'New Subtask' }]
            } as any;

            service['applyChange'](testWeek, {
                type: 'create_task',
                task: newTask,
                origin: 'user',
                window: mockWindow
            });

            const addedTask = testWeek.tasks[testWeek.tasks.length - 1];
            expect(addedTask.id).toBeDefined();
            expect(typeof addedTask.id).toBe('string');
            expect(addedTask.subtasks![0].id).toBeDefined();


            const pullTask = {
                title: 'Pulled Task',
                subtasks: [{ title: 'Pulled Subtask' }]
            } as any;

            service['applyChange'](testWeek, {
                type: 'pull_forward',
                taskIds: [],
                tasks: [pullTask],
                origin: 'system',
                window: mockWindow
            });

            const pulledTask = testWeek.tasks[testWeek.tasks.length - 1];
            expect(pulledTask.id).toBeDefined();
            expect(pulledTask.subtasks![0].id).toBeDefined();
        });

        it('generates missing IDs for tasks and subtasks during persistTasksAndSubtasks', async () => {
            const testWeek = createMockWeek();

            testWeek.tasks = [{
                projectId: 'P1',
                title: 'Task without ID',
                subtasks: [{ title: 'Subtask without ID' }]
            } as any];

            const change = { type: 'replan', window: mockWindow } as Change;
            const ctx = { bumpedEntityIds: [], allocations: [] };

            const result = await service.commit(testWeek, change, ctx, 2);

            expect(result.ok).toBe(true);

            expect(mockPrisma.schedulerTask.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: expect.any(String) }),
                    create: expect.objectContaining({ id: expect.any(String) })
                })
            );

            expect(mockPrisma.schedulerSubtask.createMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            id: expect.any(String),
                            taskId: expect.any(String)
                        })
                    ])
                })
            );
        });
    });

    describe('ID Generation & Block Seeding', () => {
        let mockWeek: WeekContainer;

        beforeEach(() => {
            mockWeek = {
                id: 'W-SEED',
                consultantId: 'C1',
                weekStart: '2026-11-02' as LocalDate,
                version: 1,
                timezone: 'UTC',
                tasks: [],
                blocks: [],
                slots: [],
                calendarEntries: [],
                holidays: [],
                metadata: {} as any,
                createdAt: '2026-11-02T00:00:00Z' as Instant,
                updatedAt: '2026-11-02T00:00:00Z' as Instant,
                lastCommittedAt: '2026-11-02T00:00:00Z' as Instant,
                sourceOfLastChange: 'system',
            };
        });

        it('generates missing IDs for create_task in applyChange', () => {
            const newTask = { title: 'No ID Task', subtasks: [{ title: 'No ID Subtask' }] } as any;

            service['applyChange'](mockWeek, { type: 'create_task', task: newTask, origin: 'user', window: {} as any });

            const added = mockWeek.tasks[0];
            expect(added.id).toBeDefined();
            expect(typeof added.id).toBe('string');
            expect(added.subtasks![0].id).toBeDefined();
        });

        it('generates missing IDs for pull_forward in applyChange', () => {
            const pullTask = { title: 'Pulled Task', subtasks: [{ title: 'Pulled Subtask' }] } as any;

            service['applyChange'](mockWeek, { type: 'pull_forward', taskIds: [], tasks: [pullTask], origin: 'system', window: {} as any });

            const pulled = mockWeek.tasks[0];
            expect(pulled.id).toBeDefined();
            expect(typeof pulled.id).toBe('string');
            expect(pulled.subtasks![0].id).toBeDefined();
        });

        it('generates missing IDs in persistTasksAndSubtasks', async () => {
            mockWeek.tasks = [{
                projectId: 'P1',
                title: 'Persist Task',
                id: undefined,
                subtasks: [{ title: 'Persist Subtask', id: undefined }]
            } as any];

            const mockTx = {
                schedulerTask: { deleteMany: jest.fn(), upsert: jest.fn() },
                schedulerSubtask: { deleteMany: jest.fn(), createMany: jest.fn() },
                schedulerProjectBlock: { update: jest.fn() }
            };

            await service['persistTasksAndSubtasks'](mockTx, mockWeek);

            expect(mockTx.schedulerTask.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: expect.any(String) },
                    create: expect.objectContaining({ id: expect.any(String) })
                })
            );

            expect(mockTx.schedulerSubtask.createMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.arrayContaining([
                        expect.objectContaining({ id: expect.any(String), taskId: expect.any(String) })
                    ])
                })
            );
        });

        it('seeds placement blocks when getWeek encounters an empty week', async () => {
            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce({
                id: 'W-EMPTY',
                consultantId: 'C1',
                timezone: 'UTC',
                weekStart: new Date('2026-11-02T00:00:00Z'),
                version: 1,
                createdAt: new Date('2026-11-02T00:00:00Z'),
                updatedAt: new Date('2026-11-02T00:00:00Z'),
                lastCommittedAt: null,
                blocks: [],
                slots: [],
                tasks: [],
                calendarEntries: []
            });

            (mockPrisma as any).projectPlacement = {
                findMany: jest.fn().mockResolvedValue([{
                    id: 'PL-1',
                    projectId: 'PROJ-1',
                    allocation: 100,
                    startDate: new Date('2026-11-01T00:00:00Z'),
                    endDate: new Date('2026-11-30T00:00:00Z')
                }, {
                    id: 'PL-OPEN',
                    projectId: 'PROJ-2',
                    allocation: 50,
                    startDate: new Date('2026-11-01T00:00:00Z'),
                    endDate: null,
                }])
            };

            (mockPrisma as any).schedulerProjectBlock = {
                createMany: jest.fn().mockResolvedValue({ count: 1 }),
                findMany: jest.fn().mockResolvedValue([{ id: 'B1', allocation: { target: 100 } }]), // Return reloaded block
                update: jest.fn()
            };

            (mockTimeService as any).workingWindows = jest.fn().mockReturnValue([
                { start: '2026-11-02T08:00:00Z', end: '2026-11-02T16:00:00Z' }
            ]);
            (mockTimeService as any).localDate = jest.fn().mockReturnValue('2026-11-02');

            const result = await service.getWeek('C1', '2026-11-02' as LocalDate);

            expect(mockPrisma.projectPlacement.findMany).toHaveBeenCalled();
            expect(mockPrisma.schedulerProjectBlock.createMany).toHaveBeenCalled();
            expect(mockPrisma.schedulerProjectBlock.findMany).toHaveBeenCalled();

            expect(result.blocks).toHaveLength(1);
        });

        it('skips placement blocks for holiday working windows', async () => {
            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce({
                id: 'W-HOLIDAY',
                consultantId: 'C1',
                timezone: 'UTC',
                weekStart: new Date('2026-11-02T00:00:00Z'),
                version: 1,
                createdAt: new Date('2026-11-02T00:00:00Z'),
                updatedAt: new Date('2026-11-02T00:00:00Z'),
                lastCommittedAt: null,
                blocks: [],
                slots: [],
                tasks: [],
                calendarEntries: [],
            });
            (mockPrisma as any).projectPlacement.findMany.mockResolvedValueOnce([{id: 'PL-HOLIDAY', projectId: 'PROJ-1', allocation: 100, startDate: new Date('2026-11-01T00:00:00Z'), endDate: new Date('2026-11-30T00:00:00Z') }]);
            (mockTimeService as any).workingWindows = jest.fn().mockReturnValue([{ start: '2026-11-02T08:00:00Z', end: '2026-11-02T16:00:00Z' }]);
            (mockTimeService as any).localDate = jest.fn().mockReturnValue('2026-11-02');
            (mockHolidayService as any).getForWeek.mockResolvedValueOnce([{ date: '2026-11-02' }]);
            (mockPrisma as any).schedulerProjectBlock.findMany.mockResolvedValueOnce([]);

            const result = await service.getWeek('C1', '2026-11-02' as LocalDate);
            expect(mockPrisma.schedulerProjectBlock.createMany).not.toHaveBeenCalled();
            expect(result.blocks).toEqual([]);
        });

        it('durationMinutes and workingWindowInstantAt calculate correctly', () => {
            const dur = service['durationMinutes']('2026-11-02T08:00:00Z', '2026-11-02T10:00:00Z');
            expect(dur).toBe(120);

            const windows = [
                { start: '2026-11-02T08:00:00Z', end: '2026-11-02T12:00:00Z' },
                { start: '2026-11-02T13:00:00Z', end: '2026-11-02T17:00:00Z' }
            ];

            const instant1 = service['workingWindowInstantAt'](windows, 60);
            expect(instant1).toBe('2026-11-02T09:00:00.000Z');

            const instant2 = service['workingWindowInstantAt'](windows, 240);
            expect(instant2).toBe('2026-11-02T13:00:00Z');

            const instant3 = service['workingWindowInstantAt'](windows, 300);
            expect(instant3).toBe('2026-11-02T14:00:00.000Z');

            const instant4 = service['workingWindowInstantAt'](windows, 1000);
            expect(instant4).toBe('2026-11-02T17:00:00Z');
        });
    });
});