import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
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
            const dto: NewTask = {
                projectId: 'proj-1',
                title: 'New Task',
                tMin: 60,
                tMax: 120,
                urgency: 2,
                complexity: 1,
                subtasks: [],
                dependsOn: [],
            };
            await service.create(mockConsultantId, mockWeekStart, dto);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({
                    type: 'create_task',
                    task: expect.objectContaining({
                        id: expect.any(String),
                        weekId: mockWeekId,
                        ...dto,
                        status: 'Ready',
                        placement: 'unplaced',
                        carriedOver: false,
                    }),
                }),
                expect.objectContaining({ bumpedEntityIds: [] }),
                undefined
            );
        });

        it('normalizes subtask ids and defaults during creation', async () => {
            await service.create(mockConsultantId, mockWeekStart, {
                projectId: 'proj-1',
                title: 'Task with subtask',
                tMin: 60,
                tMax: 120,
                urgency: 2,
                complexity: 1,
                subtasks: [{ title: 'First step' }],
                dependsOn: [],
            } as unknown as NewTask);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({
                    task: expect.objectContaining({
                        subtasks: [{
                            id: expect.any(String),
                            taskId: '',
                            title: 'First step',
                            estimate: 0,
                            done: false,
                        }],
                    }),
                }),
                expect.anything(),
                undefined,
            );
        });
    });

    describe('Security & loadTaskContext Checks', () => {
        it('throws ForbiddenException if consultantId does not match task ownership', async () => {
            prisma.schedulerTask.findUnique.mockResolvedValue({
                id: mockTaskId,
                week: { consultantId: 'DIFFERENT_OWNER', weekStart: new Date(mockWeekStart) }
            });
            await expect(service.update(mockConsultantId, mockTaskId, {})).rejects.toThrow(ForbiddenException);
        });

        it('throws NotFoundException if task does not exist in the database', async () => {
            prisma.schedulerTask.findUnique.mockResolvedValue(null);
            await expect(service.update(mockConsultantId, 'ghost-task', {})).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException if task is in DB but missing from week container', async () => {
            prisma.schedulerTask.findUnique.mockResolvedValue({
                id: 'ghost-task',
                week: { consultantId: mockConsultantId, weekStart: new Date(mockWeekStart) }
            });
            await expect(service.update(mockConsultantId, 'ghost-task', {})).rejects.toThrow(NotFoundException);
        });
    });

    describe('split', () => {
        it('throws if task is not in Ready status', async () => {
            mockTask.status = 'InProgress';
            await expect(service.split(mockConsultantId, mockTaskId, 60)).rejects.toThrow(BadRequestException);
        });

        it('throws if either half is less than 60 minutes', async () => {
            mockTask.tMax = 90;
            await expect(service.split(mockConsultantId, mockTaskId, 60)).rejects.toThrow(BadRequestException);

            mockTask.tMax = 120;
            await expect(service.split(mockConsultantId, mockTaskId, 50)).rejects.toThrow(BadRequestException);
        });

        it('throws if split boundary falls inside a subtask', async () => {
            (mockTask as any).subtasks = [
                { id: 'sub-1', durationMinutes: 45 },
                { id: 'sub-2', durationMinutes: 45 }
            ];
            mockTask.tMax = 120;

            await expect(service.split(mockConsultantId, mockTaskId, 60)).rejects.toThrow(/falls inside subtask/);
        });

        it('rejects splitting a task with a locked slot', async () => {
            mockTask.tMax = 120;
            mockWeek.slots[0].locked = true;
            await expect(service.split(mockConsultantId, mockTaskId, 60)).rejects.toThrow(/locked slots/);
        });

        it('dispatches a split_task commit if validation passes', async () => {
            mockTask.tMax = 120;
            await service.split(mockConsultantId, mockTaskId, 60, 2);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'split_task', taskId: mockTaskId, atMinutes: 60 }),
                expect.objectContaining({ bumpedEntityIds: [mockTaskId, 'slot-1'] }),
                2
            );
        });
    });

    describe('deferToNextWeek', () => {
        it('throws if tasks span multiple weeks', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: 'task-1', weekId: 'week-1', week: { consultantId: mockConsultantId } },
                { id: 'task-2', weekId: 'week-2', week: { consultantId: mockConsultantId } }
            ]);

            await expect(service.deferToNextWeek(mockConsultantId, ['task-1', 'task-2'])).rejects.toThrow(/same week/);
        });

        it('generates a warning if the deadline will be missed', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: mockTaskId, weekId: mockWeekId, deadline: new Date('2026-09-23T00:00:00Z'), week: { consultantId: mockConsultantId } }
            ]);

            txMock.schedulerWeek.findUnique.mockResolvedValue({ id: 'week-2' });

            const result = await service.deferToNextWeek(mockConsultantId, [mockTaskId]);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0].code).toBe('DEADLINE_INFEASIBLE');
        });

        it('executes a transactional migration of the tasks and cleans up slots', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: mockTaskId, weekId: mockWeekId, week: { consultantId: mockConsultantId } }
            ]);
            txMock.schedulerWeek.findUnique.mockResolvedValue({ id: 'week-2' });
            txMock.schedulerSlot.findMany.mockResolvedValue([
                { id: 'slot-1', taskIds: [mockTaskId, 'other-task'] }
            ]);

            txMock.schedulerSlotTask.findMany.mockResolvedValue([
                { slotId: 'slot-1', taskId: mockTaskId },
                { slotId: 'slot-1', taskId: 'other-task' }
            ]);

            await service.deferToNextWeek(mockConsultantId, [mockTaskId]);

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
            await expect(service.deferToNextWeek(mockConsultantId, [])).rejects.toThrow(BadRequestException);
        });

        it('throws NotFoundException if some tasks are not found in the DB', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: mockTaskId, weekId: mockWeekId, week: { consultantId: mockConsultantId } }
            ]);
            await expect(service.deferToNextWeek(mockConsultantId, [mockTaskId, 'missing-task'])).rejects.toThrow(NotFoundException);
        });

        it('returns a VERSION_CONFLICT violation if expectedVersion does not match', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: mockTaskId, weekId: mockWeekId, week: { consultantId: mockConsultantId } }
            ]);
            const staleVersion = 999;
            const result = await service.deferToNextWeek(mockConsultantId, [mockTaskId], staleVersion);
            expect(result.ok).toBe(false);
            expect(result.violations[0].code).toBe('VERSION_CONFLICT');
        });

        it('creates nextWeek if it does not exist and handles full slot deletion', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: mockTaskId, weekId: mockWeekId, week: { consultantId: mockConsultantId } }
            ]);
            txMock.schedulerWeek.findUnique.mockResolvedValue(null);
            txMock.schedulerWeek.create.mockResolvedValue({ id: 'new-week-id' });
            txMock.schedulerSlot.findMany.mockResolvedValue([{ id: 'slot-delete-me' }]);
            txMock.schedulerSlotTask.findMany.mockResolvedValue([
                { slotId: 'slot-delete-me', taskId: mockTaskId }
            ]);

            await service.deferToNextWeek(mockConsultantId, [mockTaskId]);

            expect(txMock.schedulerWeek.create).toHaveBeenCalled();
            expect(txMock.schedulerSlot.delete).toHaveBeenCalledWith({ where: { id: 'slot-delete-me' } });
        });

        it('skips slot modification if the slot does not contain the deferred tasks', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: mockTaskId, weekId: mockWeekId, week: { consultantId: mockConsultantId } }
            ]);
            txMock.schedulerWeek.findUnique.mockResolvedValue({ id: 'week-2' });
            txMock.schedulerSlot.findMany.mockResolvedValue([{ id: 'slot-skip' }]);
            txMock.schedulerSlotTask.findMany.mockResolvedValue([
                { slotId: 'slot-skip', taskId: 'other-task' }
            ]);

            await service.deferToNextWeek(mockConsultantId, [mockTaskId]);
            expect(txMock.schedulerSlot.delete).not.toHaveBeenCalled();
            expect(txMock.schedulerSlotTask.deleteMany).not.toHaveBeenCalled();
        });
    });

    describe('placeUnplaced', () => {
        it('dry-runs candidates and commits only the valid ones', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: mockTaskId, weekId: mockWeekId, week: { consultantId: mockConsultantId } },
                { id: 'task-B', weekId: mockWeekId, week: { consultantId: mockConsultantId } }
            ]);

            weekService.dryRun.mockImplementation(async (weekId, change: any) => {
                return { ok: change.taskIds.includes(mockTaskId) } as any;
            });

            await service.placeUnplaced(mockConsultantId, [mockTaskId, 'task-B']);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'place_unplaced', taskIds: [mockTaskId] }),
                expect.anything(),
                undefined
            );
        });

        // it('temporarily blinds the placer by setting unrequested unplaced tasks to placed', async () => {
        //     prisma.schedulerTask.findMany.mockResolvedValue([{ id: mockTaskId, weekId: mockWeekId, week: { consultantId: mockConsultantId } }]);

        //     const unrequestedTask = { id: 'task-B', placement: 'unplaced' } as Task;
        //     mockWeek.tasks.push(unrequestedTask);
        //     weekService.dryRun.mockResolvedValue({ ok: true } as any);

        //     await service.placeUnplaced(mockConsultantId, [mockTaskId]);

        //     expect(unrequestedTask.placement).toBe('placed');
        // });

        it('throws BadRequestException if no tasks pass the dry-run', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([{ id: mockTaskId, weekId: mockWeekId, week: { consultantId: mockConsultantId } }]);
            weekService.dryRun.mockResolvedValue({ ok: false } as any);

            await expect(service.placeUnplaced(mockConsultantId, [mockTaskId])).rejects.toThrow(/dry-run validation/);
        });

        it('throws BadRequestException if no task ids are provided', async () => {
            await expect(service.placeUnplaced(mockConsultantId, [])).rejects.toThrow(BadRequestException);
        });

        it('throws NotFoundException if some tasks are not found in the DB', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([{ id: mockTaskId, weekId: mockWeekId, week: { consultantId: mockConsultantId } }]);
            await expect(service.placeUnplaced(mockConsultantId, [mockTaskId, 'missing-task'])).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException if tasks span multiple weeks', async () => {
            prisma.schedulerTask.findMany.mockResolvedValue([
                { id: mockTaskId, weekId: 'week-1', week: { consultantId: mockConsultantId } },
                { id: 'task-b', weekId: 'week-2', week: { consultantId: mockConsultantId } }
            ]);
            await expect(service.placeUnplaced(mockConsultantId, [mockTaskId, 'task-b'])).rejects.toThrow(/same week/);
        });
    });

    describe('Core Lifecycle & Status Methods', () => {
        beforeEach(() => {
            mockWeek.slots = [];
        });

        it('update dispatches update_task commit', async () => {
            await service.update(mockConsultantId, mockTaskId, { title: 'Updated' });
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'update_task', patch: { title: 'Updated' } }),
                expect.anything(),
                undefined
            );
        });

        it('deleteTask dispatches delete_task commit', async () => {
            await service.deleteTask(mockConsultantId, mockTaskId);
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'delete_task', taskId: mockTaskId }),
                expect.anything(),
                undefined
            );
        });

        it('setStatus dispatches set_status commit', async () => {
            await service.setStatus(mockConsultantId, mockTaskId, 'InProgress');
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'set_status', status: 'InProgress' }),
                expect.anything(),
                undefined
            );
        });

        it('toggleSubtask dispatches toggle_subtask commit', async () => {
            await service.toggleSubtask(mockConsultantId, mockTaskId, 'sub-1');
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'toggle_subtask', subtaskId: 'sub-1' }),
                expect.anything(),
                undefined
            );
        });

        it('acceptDeadlineMiss dispatches accept_deadline_miss commit', async () => {
            await service.acceptDeadlineMiss(mockConsultantId, mockTaskId);
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'accept_deadline_miss' }),
                expect.anything(),
                undefined
            );
        });
    });
});