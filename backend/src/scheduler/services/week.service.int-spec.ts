import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { WeekService } from './week.service';
import { cleanDatabase } from '../../../prisma/prisma-test-utils';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TimeService, LocalDate } from './time.service';
import { HolidayService } from './holiday.service';
import { PlacerService } from './placer.service';
import { ValidatorService } from './validator.service';
import { Change, ValidateContext } from '../dto/scheduler.dto';
import { randomUUID } from 'node:crypto';

async function createConsultant(prisma: PrismaService, email: string) {
    const user = await prisma.user.create({
        data: {
            email,
            fullName: 'Scheduler Test Consultant',
            status: 'ACTIVE',
            role: 'CONSULTANT',
        },
    });

    return prisma.consultant.create({
        data: {
            userId: user.id,
            costToCompany: 500,
            addressLine1: '123 Main street',
            city: 'Pretoria',
            province: 'Gauteng',
        },
    });
}



async function createSchedulerWeek(
    prisma: PrismaService,
    consultantId: string,
    weekStartStr: string,
) {
    const weekStart = new Date(`${weekStartStr}T00:00:00Z`);
    const project = await prisma.project.create({
        data: {
            projectName: 'Scheduler Test Project',
            clientName: 'Test Client',
            status: 'OPEN',
            addressLine1: '123 Test St',
            province: 'Gauteng',
            city: 'Pretoria',
            postalCode: '0001',
            teamSize: 1,
            budget: 100,
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
            allocation: 100,
        },
    });

    return prisma.schedulerWeek.create({
        data: {
            consultantId,
            weekStart,
            timezone: 'Africa/Johannesburg',
            version: 1,
            lastCommittedAt: new Date(),
            sourceOfLastChange: 'system',
            blocks: {
                create: [
                    {
                        projectId: project.id,
                        allocatedMinutes: 120,
                        mobility: 'fluid',
                        start: new Date(`${weekStartStr}T09:00:00Z`),
                        end: new Date(`${weekStartStr}T11:00:00Z`),
                    },
                ],
            },
            tasks: {
                create: [
                    {
                        projectId: project.id,
                        title: 'Test Task',
                        tMin: 15,
                        tMax: 120,
                        status: 'Ready',
                        placement: 'placed',
                        urgency: 1,
                        complexity: 1,
                    },
                ],
            },
        },
        include: {
            blocks: true,
            tasks: true,
            slots: true,
            calendarEntries: true,
        },
    });
}

describe('WeekService - Integration-e2e-tests', () => {
    let moduleRef: TestingModule;
    let weekService: WeekService;
    let prisma: PrismaService;

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
            imports: [PrismaModule],
            providers: [
                WeekService,
                TimeService,
                HolidayService,
                PlacerService,
                ValidatorService,
            ],
        }).compile();

        weekService = moduleRef.get(WeekService);
        prisma = moduleRef.get(PrismaService);
    });

    beforeEach(async () => {
        await cleanDatabase(prisma);
    });

    afterAll(async () => {
        await prisma.$disconnect();
        if (moduleRef) {
            await moduleRef.close();
        }
    });


    async function setupFreshWeek() {
        const consultant = await createConsultant(prisma, `change-${randomUUID()}@consultiq.com`);
        const weekStartStr = '2026-11-02';
        const dbWeek = await createSchedulerWeek(prisma, consultant.id, weekStartStr);
        const week = await weekService.getWeek(consultant.id, weekStartStr as LocalDate);
        const taskId = week.tasks[0].id;
        const blockId = week.blocks[0].id;
        return { consultant, week, dbWeek, taskId, blockId, weekStartStr };
    }

    describe('getWeek function validation', () => {
        it('should auto-initialize and return a week if it does not exist in the database', async () => {
            const consultant = await createConsultant(prisma, 'test-auto@consultiq.com');
            const weekStart = '2026-09-21' as LocalDate;

            const result = await weekService.getWeek(consultant.id, weekStart);

            expect(result).toBeDefined();
            expect(result.consultantId).toBe(consultant.id);
            expect(result.weekStart).toBe(weekStart);
            expect(result.version).toBe(1);
        });

        it('successfully retrieves a week with all nested relations', async () => {
            const consultant = await createConsultant(prisma, 'test1@consultiq.com');
            const weekStartStr = '2026-09-21';

            await createSchedulerWeek(prisma, consultant.id, weekStartStr);

            const result = await weekService.getWeek(consultant.id, weekStartStr as LocalDate);

            expect(result).toBeDefined();
            expect(result.consultantId).toBe(consultant.id);
            expect(result.weekStart).toBe(weekStartStr);
            expect(result.version).toBe(1);
            expect(result.blocks.length).toBe(1);
            expect(result.tasks.length).toBe(1);
        });
    });

    describe('commit execution and concurrency tests', () => {
        it('successfully persists changes, increments version, and saves transaction', async () => {
            const consultant = await createConsultant(prisma, 'test2@consultiq.com');
            const weekStartStr = '2026-09-28';

            const dbWeek = await createSchedulerWeek(prisma, consultant.id, weekStartStr);
            const initialWeek = await weekService.getWeek(consultant.id, weekStartStr as LocalDate);

            const change: Change = {
                type: 'replan',
                window: { start: '2026-09-28T00:00:00Z' as any, end: '2026-10-05T00:00:00Z' as any }
            };
            const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };
            initialWeek.tasks[0].status = 'Done';

            const commitResult = await weekService.commit(initialWeek, change, ctx, initialWeek.version);

            expect(commitResult.ok).toBe(true);
            expect(commitResult.value.version).toBe(2);

            const savedWeek = await prisma.schedulerWeek.findUnique({
                where: { id: dbWeek.id },
                include: { tasks: true }
            });

            expect(savedWeek).toBeDefined();
            expect(savedWeek?.version).toBe(2);
            expect(savedWeek?.tasks[0].status).toBe('Done');
        });

        it('successfully handles committing new tasks and subtasks without an id (prevents undefined in notIn Prisma error)', async () => {
            const consultant = await createConsultant(prisma, 'test-undefined@consultiq.com');
            const weekStartStr = '2026-10-12';

            const dbWeek = await createSchedulerWeek(prisma, consultant.id, weekStartStr);
            const initialWeek = await weekService.getWeek(consultant.id, weekStartStr as LocalDate);

            const newTask: any = {
                projectId: initialWeek.blocks[0].projectId,
                title: 'Brand New Task Without ID',
                tMin: 15,
                tMax: 60,
                status: 'Ready',
                placement: 'placed',
                urgency: 1,
                complexity: 1,
                id: undefined,
                subtasks: [{ title: 'New Subtask', done: false, durationMinutes: 15, id: undefined }]
            };

            const change: Change = {
                type: 'create_task',
                task: newTask,
                origin: 'user',
                window: { start: '2026-10-12T00:00:00Z' as any, end: '2026-10-19T00:00:00Z' as any }
            };

            const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };
            const commitResult = await weekService.commit(initialWeek, change, ctx, initialWeek.version);

            expect(commitResult.ok).toBe(true);

            const savedWeek = await prisma.schedulerWeek.findUnique({
                where: { id: dbWeek.id },
                include: { tasks: { include: { subtasks: true } } }
            });

            expect(savedWeek?.tasks.length).toBe(2);

            const newlySavedTask = savedWeek?.tasks.find(t => t.title === 'Brand New Task Without ID');
            expect(newlySavedTask).toBeDefined();
            expect(newlySavedTask?.id).toBeDefined();
            expect(newlySavedTask?.subtasks?.length).toBe(1);
            expect(newlySavedTask?.subtasks[0].id).toBeDefined();
        });

        it('returns VERSION_CONFLICT if another transaction modified the week first', async () => {
            const consultant = await createConsultant(prisma, 'test3@consultiq.com');
            const weekStartStr = '2026-10-05';

            const dbWeek = await createSchedulerWeek(prisma, consultant.id, weekStartStr);
            const initialWeek = await weekService.getWeek(consultant.id, weekStartStr as LocalDate);
            const change: Change = { type: 'replan', window: { start: 'A' as any, end: 'B' as any } };
            const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };

            await prisma.schedulerWeek.update({
                where: { id: dbWeek.id },
                data: { version: 2 }
            });

            const commitResult = await weekService.commit(initialWeek, change, ctx, initialWeek.version);

            expect(commitResult.ok).toBe(false);
            expect(commitResult.violations[0].code).toBe('VERSION_CONFLICT');
        });
    });

    describe('applyChange operations', () => {
        let defaultCtx: ValidateContext;

        beforeEach(() => {
            defaultCtx = { bumpedEntityIds: [], allocations: [] };
        });

        it('update_task: updates targeted task properties', async () => {
            const { week, taskId } = await setupFreshWeek();
            const change = { type: 'update_task', taskId, patch: { title: 'Updated Title', urgency: 3 } } as unknown as Change;

            const res = await weekService.commit(week, change, defaultCtx, week.version);

            expect(res.ok).toBe(true);
            const updatedTask = res.value.tasks.find(t => t.id === taskId);
            expect(updatedTask?.title).toBe('Updated Title');
            expect(updatedTask?.urgency).toBe(3);

            const savedTask = await prisma.schedulerTask.findUnique({ where: { id: taskId } });
            expect(savedTask?.title).toBe('Updated Title');
        });

        it('delete_task: removes task from week', async () => {
            const { week, taskId } = await setupFreshWeek();
            const change = { type: 'delete_task', taskId } as unknown as Change;

            const res = await weekService.commit(week, change, defaultCtx, week.version);

            expect(res.ok).toBe(true);
            expect(res.value.tasks.length).toBe(0);

            const savedTask = await prisma.schedulerTask.findUnique({ where: { id: taskId } });
            expect(savedTask).toBeNull();
        });

        it('set_status: explicitly changes task status', async () => {
            const { week, taskId } = await setupFreshWeek();
            const change = { type: 'set_status', taskId, status: 'InProgress' } as unknown as Change;

            const res = await weekService.commit(week, change, defaultCtx, week.version);
            expect(res.value.tasks.find(t => t.id === taskId)?.status).toBe('InProgress');
        });

        it('place_unplaced: runs without error and reverts temporary placed status', async () => {
            const { week } = await setupFreshWeek();
            week.tasks[0].placement = 'unplaced';

            const change = { type: 'place_unplaced', taskIds: [], window: {} } as unknown as Change;
            const res = await weekService.commit(week, change, defaultCtx, week.version);

            expect(res.ok).toBe(true);

            expect(res.value.tasks[0].placement).toBe('unplaced');
        });

        it('toggle_subtask: toggles state and correctly marks parent task Done if all subtasks complete', async () => {
            const { week, taskId } = await setupFreshWeek();

            const subtaskId = randomUUID();
            week.tasks[0].subtasks = [{ id: subtaskId, title: 'Sub', done: false, durationMinutes: 10 } as any];

            const change = { type: 'toggle_subtask', taskId, subtaskId } as unknown as Change;
            const res = await weekService.commit(week, change, defaultCtx, week.version);

            const parentTask = res.value.tasks.find(t => t.id === taskId);
            expect(parentTask?.subtasks?.[0].done).toBe(true);
            expect(parentTask?.status).toBe('Done');
        });

        it('split_task: splits one task into two with proportional tMax/tMin', async () => {
            const { week, taskId } = await setupFreshWeek();

            const change = { type: 'split_task', taskId, atMinutes: 60 } as unknown as Change;

            const res = await weekService.commit(week, change, defaultCtx, week.version);

            expect(res.value.tasks.length).toBe(2);

            const originalTask = res.value.tasks.find(t => t.id === taskId);
            const newTask = res.value.tasks.find(t => t.id !== taskId);

            expect(originalTask?.tMax).toBe(60);
            expect(originalTask?.tMin).toBe(8);

            expect(newTask?.tMax).toBe(60);
            expect(newTask?.tMin).toBe(8);
            expect(newTask?.placement).toBe('unplaced');
        });

        it('accept_deadline_miss: marks task deadline as accepted', async () => {
            const { week, taskId } = await setupFreshWeek();
            week.tasks[0].unplacedReason = 'DEADLINE_INFEASIBLE';

            const change = { type: 'accept_deadline_miss', taskId } as unknown as Change;
            const res = await weekService.commit(week, change, defaultCtx, week.version);

            const task = res.value.tasks.find(t => t.id === taskId);
            expect(task?.unplacedReason).toBeUndefined();
            expect(task?.deadlineMissAccepted).toBe(true);
        });

        it('move_slot: updates slot timing and locks it', async () => {
            const { week, taskId, dbWeek } = await setupFreshWeek();
            const slotId = randomUUID();

            week.slots = [{
                id: slotId,
                kind: 'task',
                blockId: dbWeek.blocks[0].id,
                start: '2026-11-02T09:00:00Z',
                end: '2026-11-02T09:30:00Z',
                locked: false,
                taskIds: [taskId],
                daySpan: 1
            } as any];

            const change = {
                type: 'move_slot',
                slotId,
                to: { start: '2026-11-02T10:00:00Z', end: '2026-11-02T10:30:00Z' }
            } as unknown as Change;

            const res = await weekService.commit(week, change, defaultCtx, week.version);
            const slot = res.value.slots[0];

            expect(slot.start).toBe('2026-11-02T10:00:00Z');
            expect(slot.locked).toBe(true);
        });

        it('move_block: updates block timing', async () => {
            const { week, blockId } = await setupFreshWeek();
            const change = {
                type: 'move_block',
                blockId,
                to: { start: '2026-11-02T12:00:00Z', end: '2026-11-02T14:00:00Z' }
            } as unknown as Change;

            const res = await weekService.commit(week, change, defaultCtx, week.version);
            expect(res.value.blocks[0].start).toBe('2026-11-02T12:00:00Z');
        });

        it('resize_block: updates timing and marks userSized to true', async () => {
            const { week, blockId } = await setupFreshWeek();
            const change = {
                type: 'resize_block',
                blockId,
                to: { start: '2026-11-02T12:00:00Z', end: '2026-11-02T15:00:00Z' }
            } as unknown as Change;

            const res = await weekService.commit(week, change, defaultCtx, week.version);
            expect(res.value.blocks[0].userSized).toBe(true);
        });

        it('pin_block: toggles mobility to pinned or fluid', async () => {
            const { week, blockId } = await setupFreshWeek();
            const change = { type: 'pin_block', blockId, pinned: true } as unknown as Change;

            const res = await weekService.commit(week, change, defaultCtx, week.version);
            expect(res.value.blocks[0].mobility).toBe('pinned');
        });

        it('calendar_upsert: inserts a new calendar entry', async () => {
            const { week } = await setupFreshWeek();
            const entryId = randomUUID();

            const change = {
                type: 'calendar_upsert',
                entry: {
                    id: entryId,
                    type: 'meeting',
                    start: '2026-11-02T10:00:00Z',
                    end: '2026-11-02T11:00:00Z',
                    origin: 'user',
                    tags: ['urgent']
                }
            } as unknown as Change;

            const res = await weekService.commit(week, change, defaultCtx, week.version);
            expect(res.value.calendarEntries.length).toBe(1);

            const savedDb = await prisma.schedulerCalendarEntry.findUnique({ where: { id: entryId } });
            expect(savedDb).toBeDefined();
            expect(savedDb?.type).toBe('meeting');
        });

        it('calendar_remove: removes a calendar entry', async () => {
            const { week } = await setupFreshWeek();
            const entryId = randomUUID();

            week.calendarEntries = [{ id: entryId, type: 'meeting', start: '...', end: '...', origin: 'user' } as any];

            const change = { type: 'calendar_remove', entryId } as unknown as Change;
            const res = await weekService.commit(week, change, defaultCtx, week.version);

            expect(res.value.calendarEntries.length).toBe(0);
        });

        it('pull_forward: pushes tasks into the week', async () => {
            const { week } = await setupFreshWeek();
            const newTaskId = randomUUID();

            const change = {
                type: 'pull_forward',
                tasks: [{
                    id: newTaskId,
                    title: 'Pulled Task',
                    projectId: week.blocks[0].projectId,
                    tMin: 10,
                    tMax: 20,
                    urgency: 1,
                    complexity: 1,
                    status: 'Ready',
                    placement: 'unplaced',
                    carriedOver: false
                }]
            } as unknown as Change;

            const res = await weekService.commit(week, change, defaultCtx, week.version);

            expect(res.value.tasks.length).toBe(2);
            expect(res.value.tasks.find(t => t.id === newTaskId)).toBeDefined();
        });

        it('rollover: unplaces task, marks it carriedOver, removes from slot', async () => {
            const { week, taskId, dbWeek } = await setupFreshWeek();
            const slotId = randomUUID();

            week.slots = [{
                id: slotId,
                kind: 'task',
                blockId: dbWeek.blocks[0].id,
                start: '2026-11-02T09:00:00Z',
                end: '2026-11-02T10:00:00Z',
                locked: false,
                daySpan: 1,
                taskIds: [taskId]
            } as any];

            const change = { type: 'rollover', taskId, fromSlotId: slotId } as unknown as Change;
            const res = await weekService.commit(week, change, defaultCtx, week.version);

            const task = res.value.tasks.find(t => t.id === taskId);
            expect(task?.placement).toBe('unplaced');
            expect(task?.carriedOver).toBe(true);

            const slot = res.value.slots.find(s => s.id === slotId);
            expect(slot?.taskIds.includes(taskId)).toBe(false);
        });

        it('mark_incomplete: resets task from Done to InProgress and unchecks last done subtask', async () => {
            const { week, taskId } = await setupFreshWeek();

            week.tasks[0].status = 'Done';
            week.tasks[0].subtasks = [
                { id: 'sub1', done: true, title: 'S1', durationMinutes: 10 } as any,
                { id: 'sub2', done: true, title: 'S2', durationMinutes: 10 } as any
            ];

            const change = { type: 'mark_incomplete', taskId } as unknown as Change;
            const res = await weekService.commit(week, change, defaultCtx, week.version);

            const task = res.value.tasks.find(t => t.id === taskId);
            expect(task?.status).toBe('InProgress');
            expect(task?.subtasks?.find(s => s.id === 'sub2')?.done).toBe(false);
            expect(task?.subtasks?.find(s => s.id === 'sub1')?.done).toBe(true);
        });
    });
});