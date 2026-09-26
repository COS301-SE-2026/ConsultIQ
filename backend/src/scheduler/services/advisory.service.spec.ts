import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdvisoryService } from './advisory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService } from './week.service';
import { PlacerService } from './placer.service';
import { TimeService, LocalDate, Instant } from './time.service';
import { WeekContainer } from '../dto/scheduler.dto';

jest.mock('./scheduler-rules.constant', () => ({
    SCHEDULER_RULES: {
        BUFFER_TARGET_MIN_MINUTES: 60
    },
}));

describe('AdvisoryService', () => {
    let service: AdvisoryService;
    let prisma: any;
    let weekService: jest.Mocked<WeekService>;
    let placerService: jest.Mocked<PlacerService>;

    const mockWeekId = 'week-1';
    const mockConsultantId = 'cons-1';
    const mockWeekStart = '2026-09-21' as LocalDate;
    const mockTimezone = 'Africa/Johannesburg';

    let baseWeek: WeekContainer;

    beforeEach(async () => {
        baseWeek = {
            id: mockWeekId,
            consultantId: mockConsultantId,
            weekStart: mockWeekStart,
            timezone: mockTimezone,
            tasks: [],
            blocks: [],
            slots: [],
            calendarEntries: [],
            holidays: [],
            version: 1,
            lastCommittedAt: new Date() as any,
            sourceOfLastChange: 'system',
            createdAt: new Date() as any,
            updatedAt: new Date() as any,
            metadata: { available: 2000, scheduled: 1000 } as any,
        };

        const prismaMock = {
            schedulerIssueDismissal: {
                findMany: jest.fn().mockResolvedValue([]),
                upsert: jest.fn(),
            },
            schedulerWeek: {
                findUnique: jest.fn(),
            },
            schedulerTask: {
                findMany: jest.fn(),
            },
        };

        const weekServiceMock = {
            getWeek: jest.fn().mockResolvedValue(baseWeek),
            dryRun: jest.fn().mockResolvedValue({ ok: true }),
            commit: jest.fn().mockResolvedValue({ ok: true, value: baseWeek }),
        };

        const placerServiceMock = {
            priorityScore: jest.fn().mockReturnValue(10),
        };

        const timeServiceMock = {
            localDateToInstant: jest.fn((date) => `${date}T00:00:00Z` as Instant),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdvisoryService,
                { provide: PrismaService, useValue: prismaMock },
                { provide: WeekService, useValue: weekServiceMock },
                { provide: PlacerService, useValue: placerServiceMock },
                { provide: TimeService, useValue: timeServiceMock },
            ],
        }).compile();

        service = module.get(AdvisoryService);
        prisma = module.get(PrismaService);
        weekService = module.get(WeekService);
        placerService = module.get(PlacerService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('buildSuggestions', () => {
        it('returns nothing if gap is <= 0', async () => {
            baseWeek.metadata = { available: 1000, scheduled: 950 } as any;

            const suggestions = await service.buildSuggestions(baseWeek);
            expect(suggestions).toEqual([]);
        });

        it('suggests PLACE_UNPLACED if there are unplaced tasks and dryRun passes', async () => {
            baseWeek.tasks = [{ id: 'task-1', placement: 'unplaced' } as any];

            const suggestions = await service.buildSuggestions(baseWeek);

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].code).toBe('PLACE_UNPLACED');
            expect(weekService.dryRun).toHaveBeenCalledWith(
                mockWeekId,
                expect.objectContaining({ type: 'replan' })
            );
        });

        it('omits PLACE_UNPLACED if the dryRun fails (cannot actually place)', async () => {
            baseWeek.tasks = [{ id: 'task-1', placement: 'unplaced' } as any];
            weekService.dryRun.mockResolvedValueOnce({ ok: false } as any);

            const suggestions = await service.buildSuggestions(baseWeek);

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].code).toBe('REVIEW_CAPACITY');
        });

        it('suggests PULL_FORWARD if next week has ready tasks that fit', async () => {

            prisma.schedulerIssueDismissal.findMany.mockResolvedValue([{ code: 'PLACE_UNPLACED' }]);

            prisma.schedulerWeek.findUnique.mockResolvedValue({
                id: 'week-2',
                tasks: [{ id: 'task-2', status: 'Ready', tMax: 120 }],
            });

            const suggestions = await service.buildSuggestions(baseWeek);

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].code).toBe('PULL_FORWARD');
            expect(suggestions[0].action?.taskIds).toContain('task-2');
        });

        it('suggests EXTEND_BLOCK if project has waiting tasks and block is fluid', async () => {
            prisma.schedulerIssueDismissal.findMany.mockResolvedValue([
                { code: 'PLACE_UNPLACED' },
                { code: 'PULL_FORWARD' }
            ]);

            baseWeek.blocks = [{
                id: 'block-1',
                projectId: 'proj-1',
                mobility: 'fluid',
                start: '2026-09-22T08:00:00Z',
                end: '2026-09-22T17:00:00Z'
            } as any];

            baseWeek.tasks = [{ id: 'task-1', projectId: 'proj-1', status: 'Ready', placement: 'placed' } as any];

            const suggestions = await service.buildSuggestions(baseWeek);

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].code).toBe('EXTEND_BLOCK');
            expect(suggestions[0].action?.type).toBe('resize_block');
        });

        it('falls back to REVIEW_CAPACITY if no other suggestions match', async () => {
            const suggestions = await service.buildSuggestions(baseWeek);

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].code).toBe('REVIEW_CAPACITY');

            expect(suggestions[0].message).toContain('15h40m');
        });

        it('returns empty array if REVIEW_CAPACITY is dismissed and no other candidates exist', async () => {
            prisma.schedulerIssueDismissal.findMany.mockResolvedValue([{ code: 'REVIEW_CAPACITY' }]);

            const suggestions = await service.buildSuggestions(baseWeek);
            expect(suggestions).toHaveLength(0);
        });
    });

    describe('pullForward', () => {
        it('throws NotFoundException if the week does not exist', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue(null);

            await expect(service.pullForward('bad-id', ['task-1'])).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException if requested tasks are missing', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue({
                id: mockWeekId,
                weekStart: new Date(mockWeekStart)
            });

            prisma.schedulerTask.findMany.mockResolvedValue([]);

            await expect(service.pullForward(mockWeekId, ['task-1'])).rejects.toThrow(NotFoundException);
        });

        it('dispatches pull_forward change via weekService.commit', async () => {
            prisma.schedulerWeek.findUnique.mockResolvedValue({
                id: mockWeekId,
                consultantId: mockConsultantId,
                weekStart: new Date(mockWeekStart)
            });
            prisma.schedulerTask.findMany.mockResolvedValue([{ id: 'task-1' }]);

            const result = await service.pullForward(mockWeekId, ['task-1'], 2);

            expect(result.ok).toBe(true);
            expect(weekService.commit).toHaveBeenCalledWith(
                baseWeek,
                expect.objectContaining({ type: 'pull_forward', taskIds: ['task-1'] }),
                expect.objectContaining({ bumpedEntityIds: [] }),
                2
            );
        });
    });

    describe('dismiss', () => {
        it('upserts a dismissal record directly to the database', async () => {
            await service.dismiss(mockWeekId, 'REVIEW_CAPACITY');

            expect(prisma.schedulerIssueDismissal.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { weekId_code: { weekId: mockWeekId, code: 'REVIEW_CAPACITY' } },
                    update: expect.any(Object),
                    create: expect.any(Object)
                })
            );
        });
    });
});