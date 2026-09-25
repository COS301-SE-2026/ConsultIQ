import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WeekService } from './week.service';
import { cleanDatabase } from '../../../prisma/prisma-test-utils';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TimeService, LocalDate } from './time.service';
import { HolidayService } from './holiday.service';
import { PlacerService } from './placer.service';
import { ValidatorService } from './validator.service';
import { Change, ValidateContext } from '../dto/scheduler.dto';



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

    describe('getWeek function validation', () => {
        it('should throw NotFoundException if the week does not exist in the database', async () => {
            const testUUID = '00000000-0000-0000-0000-000000000000';
            const weekStart = '2026-09-21' as LocalDate;

            await expect(
                weekService.getWeek(testUUID, weekStart),
            ).rejects.toThrow(NotFoundException);
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
            expect(commitResult.violations.length).toBe(1);
            expect(commitResult.violations[0].code).toBe('VERSION_CONFLICT');
            const savedWeek = await prisma.schedulerWeek.findUnique({ where: { id: dbWeek.id } });
            expect(savedWeek?.version).toBe(2);
        });
    });
});