import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerController } from './scheduler.controller';
import { WeekService } from '../../scheduler/services/week.service';
import { TaskService } from '../../scheduler/services/task.service';
import { ManualPlacementService } from '../../scheduler/services/manual-placement.service';
import { CalendarService } from '../../scheduler/services/calendar.service';
import { AdvisoryService } from '../../scheduler/services/advisory.service';
import { RolloverService } from '../../scheduler/services/rollover.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('SchedulerController', () => {
    let controller: SchedulerController;
    let weekService: any;
    let taskService: any;
    let manualPlacementService: any;
    let calendarService: any;
    let advisoryService: any;
    let rolloverService: any;

    const mockConsultantId = 'cons-123';
    const mockReq = { user: { userId: mockConsultantId } };
    const mockWeekStart = '2026-09-28';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SchedulerController],
            providers: [
                {
                    provide: PrismaService,
                    useValue: {
                        consultant: {
                            findUnique: jest.fn().mockResolvedValue({ id: mockConsultantId }),
                        },
                    },
                },
                {
                    provide: WeekService,
                    useValue: {
                        getWeek: jest.fn().mockResolvedValue({ id: 'week-1', consultantId: mockConsultantId }),
                        replan: jest.fn().mockResolvedValue({ ok: true }),
                        dryRun: jest.fn().mockResolvedValue({ ok: true }),
                    },
                },
                {
                    provide: TaskService,
                    useValue: {
                        create: jest.fn().mockResolvedValue({ ok: true }),
                        update: jest.fn().mockResolvedValue({ ok: true }),
                        deleteTask: jest.fn().mockResolvedValue({ ok: true }),
                        setStatus: jest.fn().mockResolvedValue({ ok: true }),
                        toggleSubtask: jest.fn().mockResolvedValue({ ok: true }),
                        split: jest.fn().mockResolvedValue({ ok: true }),
                        acceptDeadlineMiss: jest.fn().mockResolvedValue({ ok: true }),
                        deferToNextWeek: jest.fn().mockResolvedValue({ ok: true }),
                        placeUnplaced: jest.fn().mockResolvedValue({ ok: true }),
                    },
                },
                {
                    provide: ManualPlacementService,
                    useValue: {
                        moveSlot: jest.fn().mockResolvedValue({ ok: true }),
                        moveBlock: jest.fn().mockResolvedValue({ ok: true }),
                        resizeBlock: jest.fn().mockResolvedValue({ ok: true }),
                        pinBlock: jest.fn().mockResolvedValue({ ok: true }),
                    },
                },
                {
                    provide: CalendarService,
                    useValue: {
                        upsert: jest.fn().mockResolvedValue({ ok: true }),
                        remove: jest.fn().mockResolvedValue({ ok: true }),
                    },
                },
                {
                    provide: AdvisoryService,
                    useValue: {
                        buildSuggestions: jest.fn().mockResolvedValue([]),
                        pullForward: jest.fn().mockResolvedValue({ ok: true }),
                        dismiss: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: RolloverService,
                    useValue: {
                        rollover: jest.fn().mockResolvedValue({ ok: true }),
                    },
                },

            ],
        })
            .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
            .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get(SchedulerController);
        weekService = module.get(WeekService);
        taskService = module.get(TaskService);
        manualPlacementService = module.get(ManualPlacementService);
        calendarService = module.get(CalendarService);
        advisoryService = module.get(AdvisoryService);
        rolloverService = module.get(RolloverService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Weeks', () => {
        it('should get a week using consultantId from request', async () => {
            await controller.getWeek(mockWeekStart, mockReq);
            expect(weekService.getWeek).toHaveBeenCalledWith(mockConsultantId, mockWeekStart);
        });

        it('should replan a week', async () => {
            await controller.replan(mockWeekStart, { expectedVersion: 1 }, mockReq);
            expect(weekService.replan).toHaveBeenCalledWith('week-1', 1);
        });

        it('should dry-run a change', async () => {
            const change = { type: 'create_task' } as any;
            await controller.dryRun(mockWeekStart, { change, expectedVersion: 1 }, mockReq);
            expect(weekService.dryRun).toHaveBeenCalledWith('week-1', change, 1);
        });
    });

    describe('Tasks', () => {
        it('should create a task with consultantId', async () => {
            await controller.createTask('2026-09-28', { projectId: 'p-1', title: 'Test', expectedVersion: 1 }, mockReq);
            expect(taskService.create).toHaveBeenCalledWith(
                mockConsultantId,
                mockWeekStart,
                { projectId: 'p-1', title: 'Test', dependsOn: [] },
                1
            );
        });
        it('should update a task with consultantId', async () => {
            await controller.updateTask('task-1', { title: 'Updated', expectedVersion: 1 }, mockReq);
            expect(taskService.update).toHaveBeenCalledWith(mockConsultantId, 'task-1', { title: 'Updated' }, 1);
        });

        it('should delete a task with consultantId', async () => {
            await controller.deleteTask('task-1', { expectedVersion: 1 }, mockReq);
            expect(taskService.deleteTask).toHaveBeenCalledWith(mockConsultantId, 'task-1', 1);
        });

        it('should set task status with consultantId', async () => {
            await controller.setTaskStatus('task-1', { status: 'InProgress', expectedVersion: 1 }, mockReq);
            expect(taskService.setStatus).toHaveBeenCalledWith(mockConsultantId, 'task-1', 'InProgress', 1);
        });

        it('should toggle subtask with consultantId', async () => {
            await controller.toggleSubtask('task-1', 'sub-1', { expectedVersion: 1 }, mockReq);
            expect(taskService.toggleSubtask).toHaveBeenCalledWith(mockConsultantId, 'task-1', 'sub-1', 1);
        });

        it('should split task with consultantId', async () => {
            await controller.splitTask('task-1', { atMinutes: 60, expectedVersion: 1 }, mockReq);
            expect(taskService.split).toHaveBeenCalledWith(mockConsultantId, 'task-1', 60, 1);
        });

        it('should accept deadline miss with consultantId', async () => {
            await controller.acceptDeadlineMiss('task-1', { expectedVersion: 1 }, mockReq);
            expect(taskService.acceptDeadlineMiss).toHaveBeenCalledWith(mockConsultantId, 'task-1', 1);
        });

        it('should defer tasks with consultantId', async () => {
            await controller.deferTasks({ taskIds: ['t-1'], expectedVersion: 1 }, mockReq);
            expect(taskService.deferToNextWeek).toHaveBeenCalledWith(mockConsultantId, ['t-1'], 1);
        });

        it('should place unplaced tasks with consultantId', async () => {
            await controller.placeUnplaced({ taskIds: ['t-1'], expectedVersion: 1 }, mockReq);
            expect(taskService.placeUnplaced).toHaveBeenCalledWith(mockConsultantId, ['t-1'], 1);
        });

        it('should rollover task with consultantId', async () => {
            await controller.rolloverTask('task-1', { fromSlotId: 'slot-1', expectedVersion: 1 }, mockReq);
            expect(rolloverService.rollover).toHaveBeenCalledWith(mockConsultantId, 'task-1', 'slot-1', 1);
        });
    });

    describe('Manual Placement', () => {
        const interval = { start: '2026-09-28T08:00:00Z', end: '2026-09-28T09:00:00Z' };

        it('should move slot with consultantId', async () => {
            await controller.moveSlot('slot-1', { to: interval, confirmedOverride: true, expectedVersion: 1 }, mockReq);
            expect(manualPlacementService.moveSlot).toHaveBeenCalledWith(mockConsultantId, 'slot-1', interval, true, 1);
        });

        it('should move block with consultantId', async () => {
            await controller.moveBlock('block-1', { to: interval, confirmedOverride: false, expectedVersion: 1 }, mockReq);
            expect(manualPlacementService.moveBlock).toHaveBeenCalledWith(mockConsultantId, 'block-1', interval, false, 1);
        });

        it('should resize block with consultantId', async () => {
            await controller.resizeBlock('block-1', { to: interval, confirmedOverride: true, expectedVersion: 1 }, mockReq);
            expect(manualPlacementService.resizeBlock).toHaveBeenCalledWith(mockConsultantId, 'block-1', interval, true, 1);
        });

        it('should pin block with consultantId', async () => {
            await controller.pinBlock('block-1', { pinned: true, expectedVersion: 1 }, mockReq);
            expect(manualPlacementService.pinBlock).toHaveBeenCalledWith(mockConsultantId, 'block-1', true, 1);
        });
    });

    describe('Calendar Entries & Advisory', () => {
        it('should upsert calendar entry with consultantId', async () => {
            const entry = { type: 'meeting', start: 'a', end: 'b' };
            await controller.upsertCalendarEntry(mockWeekStart, entry, mockReq);
            expect(calendarService.upsert).toHaveBeenCalledWith(mockConsultantId, mockWeekStart, entry);
        });

        it('should remove calendar entry with consultantId', async () => {
            await controller.removeCalendarEntry('entry-1', { expectedVersion: 1 }, mockReq);
            expect(calendarService.remove).toHaveBeenCalledWith(mockConsultantId, 'entry-1', 1);
        });

        it('should get suggestions', async () => {
            await controller.getSuggestions(mockWeekStart, mockReq);
            expect(advisoryService.buildSuggestions).toHaveBeenCalled();
        });

        it('should pull forward tasks', async () => {
            await controller.pullForward(mockWeekStart, { taskIds: ['t-1'], expectedVersion: 1 }, mockReq);
            expect(advisoryService.pullForward).toHaveBeenCalledWith('week-1', ['t-1'], 1);
        });

        it('should dismiss suggestion', async () => {
            await controller.dismissSuggestion(mockWeekStart, 'CODE_1', mockReq);
            expect(advisoryService.dismiss).toHaveBeenCalledWith('week-1', 'CODE_1');
        });
    });
});