import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskService } from './task.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService } from './week.service';
import { TimeService, LocalDate, Instant } from './time.service';
import { WeekContainer, Task, NewTask } from '../dto/scheduler.dto';

describe('TaskService', () => {
    let service: TaskService;
    let prisma: any;
    let weekService: jest.Mocked<WeekService>;
    let timeService: jest.Mocked<TimeService>;
    let txMock: any;

    const mockConsultantId = 'cons-1';
    const mockWeekStart = '2026-09-21' as LocalDate;
    const mockTaskId = 'task-1';
    const mockWeekId = 'week-1';

    let mockWeek: WeekContainer;
    let mockTask: Task;

    beforeEach(async () => {
        mockTask = {
            id: mockTaskId,
            weekId: mockWeekId,
            status: 'Ready',
            tMin: 120,
            tMax: 120,
            placement: 'placed',
            projectId: 'proj-1'
        } as Task;

        mockWeek = {
            id: mockWeekId,
            consultantId: mockConsultantId,
            weekStart: mockWeekStart,
            timezone: 'Africa/Johannesburg',
            version: 1,
            tasks: [mockTask],
            blocks: [],
            slots: [
                { id: 'slot-1', taskIds: [mockTaskId], start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' } as any
            ],
            calendarEntries: [],
            holidays: [],
            lastCommittedAt: new Date() as any,
            sourceOfLastChange: 'system',
            createdAt: new Date() as any,
            updatedAt: new Date() as any,
            metadata: {} as any
        };

        txMock = {
            schedulerWeek: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
            schedulerTask: { updateMany: jest.fn() },
            schedulerSlot: { findMany: jest.fn().mockResolvedValue([]), delete: jest.fn(), update: jest.fn() },

            schedulerSlotTask: {
                findMany: jest.fn().mockResolvedValue([]),
                deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
            },

        };

        const prismaMock = {
            schedulerTask: {
                findUnique: jest.fn().mockResolvedValue({ id: mockTaskId, week: { consultantId: mockConsultantId, weekStart: new Date(mockWeekStart) } }),
                findMany: jest.fn().mockResolvedValue([{ id: mockTaskId, weekId: mockWeekId }]),
            },
            $transaction: jest.fn(async (cb) => cb(txMock)),
        };

        const weekServiceMock = {
            getWeek: jest.fn().mockResolvedValue(mockWeek),
            commit: jest.fn().mockResolvedValue({ ok: true, value: mockWeek }),
            dryRun: jest.fn().mockResolvedValue({ ok: true }),
        };

        const timeServiceMock = {
            localDate: jest.fn().mockReturnValue('2026-09-21'),
            localDateToInstant: jest.fn((date) => `${date}T00:00:00Z` as Instant),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TaskService,
                { provide: PrismaService, useValue: prismaMock },
                { provide: WeekService, useValue: weekServiceMock },
                { provide: TimeService, useValue: timeServiceMock },
            ],
        }).compile();

        service = module.get(TaskService);
        prisma = module.get(PrismaService);
        weekService = module.get(WeekService);
        timeService = module.get(TimeService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('dispatches a create_task commit', async () => {
            const dto = { title: 'New Task' } as NewTask;
            await service.create(mockConsultantId, mockWeekStart, dto);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'create_task', task: dto }),
                expect.objectContaining({ bumpedEntityIds: [] }),
                undefined
            );
        });
    });

    describe('split', () => {
        it('throws if task is not in Ready status', async () => {
            mockTask.status = 'InProgress';
            await expect(service.split(mockTaskId, 60)).rejects.toThrow(BadRequestException);
        });

        it('throws if either half is less than 60 minutes', async () => {
            mockTask.tMax = 90;
            await expect(service.split(mockTaskId, 60)).rejects.toThrow(BadRequestException);

            mockTask.tMax = 120;
            await expect(service.split(mockTaskId, 50)).rejects.toThrow(BadRequestException);
        });

        it('throws if split boundary falls inside a subtask', async () => {
            (mockTask as any).subtasks = [
                { id: 'sub-1', durationMinutes: 45 },
                { id: 'sub-2', durationMinutes: 45 }
            ];
            mockTask.tMax = 120;

            await expect(service.split(mockTaskId, 60)).rejects.toThrow(/falls inside subtask/);
        });

        it('dispatches a split_task commit if validation passes', async () => {
            mockTask.tMax = 120;
            await service.split(mockTaskId, 60, 2);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'split_task', taskId: mockTaskId, atMinutes: 60 }),
                expect.objectContaining({ bumpedEntityIds: [mockTaskId] }),
                2
            );
        });
    });

    describe('deferToNextWeek', () => {
        it('throws if tasks span multiple weeks', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: 'task-1', weekId: 'week-1' },
                { id: 'task-2', weekId: 'week-2' }
            ]);

            await expect(service.deferToNextWeek(['task-1', 'task-2'])).rejects.toThrow(/same week/);
        });

        it('generates a warning if the deadline will be missed', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: mockTaskId, weekId: mockWeekId, deadline: new Date('2026-09-23T00:00:00Z') }
            ]);

            txMock.schedulerWeek.findUnique.mockResolvedValue({ id: 'week-2' });

            const result = await service.deferToNextWeek([mockTaskId]);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0].code).toBe('DEADLINE_INFEASIBLE');
        });

        it('executes a transactional migration of the tasks and cleans up slots', async () => {
            txMock.schedulerWeek.findUnique.mockResolvedValue({ id: 'week-2' });
            txMock.schedulerSlot.findMany.mockResolvedValue([
                { id: 'slot-1', taskIds: [mockTaskId, 'other-task'] }
            ]);

            txMock.schedulerSlotTask.findMany.mockResolvedValue([
                { slotId: 'slot-1', taskId: mockTaskId },
                { slotId: 'slot-1', taskId: 'other-task' }
            ]);

            await service.deferToNextWeek([mockTaskId]);

            expect(txMock.schedulerTask.updateMany).toHaveBeenCalledWith({
                where: { id: { in: [mockTaskId] } },
                data: expect.objectContaining({ weekId: 'week-2', placement: 'unplaced' })
            });

            expect(txMock.schedulerSlotTask.deleteMany).toHaveBeenCalledWith({
                where: {
                    slotId: 'slot-1',
                    taskId: { in: expect.any(Array) }
                }
            });

            expect(txMock.schedulerWeek.updateMany).toHaveBeenCalledWith({
                where: { id: { in: ['week-1', 'week-2'] } },
                data: { version: { increment: 1 } }
            });
        });

        it('throws BadRequestException if no task ids are provided', async () => {
            await expect(service.deferToNextWeek([])).rejects.toThrow(BadRequestException);
        });

        it('throws NotFoundException if some tasks are not found in the DB', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([{ id: mockTaskId, weekId: mockWeekId }]);
            await expect(service.deferToNextWeek([mockTaskId, 'missing-task'])).rejects.toThrow(NotFoundException);
        });

        it('returns a VERSION_CONFLICT violation if expectedVersion does not match', async () => {
            const staleVersion = 999;
            const result = await service.deferToNextWeek([mockTaskId], staleVersion);
            expect(result.ok).toBe(false);
            expect(result.violations[0].code).toBe('VERSION_CONFLICT');
        });

        it('creates nextWeek if it does not exist and handles full slot deletion', async () => {
            txMock.schedulerWeek.findUnique.mockResolvedValue(null);
            txMock.schedulerWeek.create.mockResolvedValue({ id: 'new-week-id' });
            txMock.schedulerSlot.findMany.mockResolvedValue([{ id: 'slot-delete-me' }]);
            txMock.schedulerSlotTask.findMany.mockResolvedValue([
                { slotId: 'slot-delete-me', taskId: mockTaskId }
            ]);

            await service.deferToNextWeek([mockTaskId]);

            expect(txMock.schedulerWeek.create).toHaveBeenCalled();
            expect(txMock.schedulerSlot.delete).toHaveBeenCalledWith({ where: { id: 'slot-delete-me' } });
        });

        it('skips slot modification if the slot does not contain the deferred tasks', async () => {
            txMock.schedulerWeek.findUnique.mockResolvedValue({ id: 'week-2' });
            txMock.schedulerSlot.findMany.mockResolvedValue([{ id: 'slot-skip' }]);
            txMock.schedulerSlotTask.findMany.mockResolvedValue([
                { slotId: 'slot-skip', taskId: 'other-task' }
            ]);

            await service.deferToNextWeek([mockTaskId]);
            expect(txMock.schedulerSlot.delete).not.toHaveBeenCalled();
            expect(txMock.schedulerSlotTask.deleteMany).not.toHaveBeenCalled();
        });
    });

    describe('placeUnplaced', () => {
        it('dry-runs candidates and commits only the valid ones', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: mockTaskId, weekId: mockWeekId },
                { id: 'task-B', weekId: mockWeekId }
            ]);

            weekService.dryRun.mockImplementation(async (weekId, change: any) => {
                return { ok: change.taskIds.includes(mockTaskId) } as any;
            });

            await service.placeUnplaced([mockTaskId, 'task-B']);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'place_unplaced', taskIds: [mockTaskId] }),
                expect.anything(),
                undefined
            );
        });

        it('throws BadRequestException if no tasks pass the dry-run', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([{ id: mockTaskId, weekId: mockWeekId }]);
            weekService.dryRun.mockResolvedValue({ ok: false } as any);

            await expect(service.placeUnplaced([mockTaskId])).rejects.toThrow(/dry-run validation/);
        });

        it('throws BadRequestException if no task ids are provided', async () => {
            await expect(service.placeUnplaced([])).rejects.toThrow(BadRequestException);
        });

        it('throws NotFoundException if some tasks are not found in the DB', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([{ id: mockTaskId, weekId: mockWeekId }]);
            await expect(service.placeUnplaced([mockTaskId, 'missing-task'])).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException if tasks span multiple weeks', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: mockTaskId, weekId: 'week-1' },
                { id: 'task-b', weekId: 'week-2' }
            ]);
            await expect(service.placeUnplaced([mockTaskId, 'task-b'])).rejects.toThrow(/same week/);
        });
    });

    describe('Core Lifecycle & Status Methods', () => {
        beforeEach(() => {
            mockWeek.slots = [];
        });

        it('update dispatches update_task commit', async () => {
            await service.update(mockTaskId, { title: 'Updated' });
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'update_task', patch: { title: 'Updated' } }),
                expect.anything(),
                undefined
            );
        });

        it('deleteTask dispatches delete_task commit', async () => {
            await service.deleteTask(mockTaskId);
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'delete_task', taskId: mockTaskId }),
                expect.anything(),
                undefined
            );
        });

        it('setStatus dispatches set_status commit', async () => {
            await service.setStatus(mockTaskId, 'InProgress');
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'set_status', status: 'InProgress' }),
                expect.anything(),
                undefined
            );
        });

        it('toggleSubtask dispatches toggle_subtask commit', async () => {
            await service.toggleSubtask(mockTaskId, 'sub-1');
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'toggle_subtask', subtaskId: 'sub-1' }),
                expect.anything(),
                undefined
            );
        });

        it('acceptDeadlineMiss dispatches accept_deadline_miss commit', async () => {
            await service.acceptDeadlineMiss(mockTaskId);
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'accept_deadline_miss' }),
                expect.anything(),
                undefined
            );
        });

        it('throws NotFoundException if task is in DB but missing from week container', async () => {
            prisma.schedulerTask.findUnique.mockResolvedValue({
                id: 'ghost-task',
                week: { consultantId: mockConsultantId, weekStart: new Date(mockWeekStart) }
            });
            await expect(service.update('ghost-task', {})).rejects.toThrow(NotFoundException);
        });
    });
});