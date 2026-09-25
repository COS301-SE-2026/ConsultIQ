import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WeekService } from './week.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeService, LocalDate, Instant } from './time.service';
import { HolidayService } from './holiday.service';
import { PlacerService } from './placer.service';
import { ValidatorService } from './validator.service';
import { WeekContainer, Change, Task, ProjectBlock, Slot, ValidateContext, Interval } from '../dto/scheduler.dto';

describe('WeekService', () => {
    let service: WeekService;
    let prisma: PrismaService;
    let timeService: TimeService;
    let holidayService: HolidayService;
    let placerService: PlacerService;
    let validatorService: ValidatorService;
    const mockWindow: Interval = { start: '2026-09-28T00:00:00Z', end: '2026-09-29T00:00:00Z' };

    const mockDate = new Date('2026-09-25T00:00:00Z');

    const mockPrisma = {
        schedulerWeek: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        schedulerSlot: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
        },
        schedulerTask: {
            update: jest.fn(),
        },
        schedulerProjectBlock: {
            update: jest.fn(),
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
        timeService = module.get(TimeService);
        holidayService = module.get(HolidayService);
        placerService = module.get(PlacerService);
        validatorService = module.get(ValidatorService);

        jest.clearAllMocks();
    });

    describe('getWeek', () => {
        it('throws NotFoundException if week does not exist', async () => {
            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce(null);
            await expect(service.getWeek('C1', '2026-09-25' as LocalDate)).rejects.toThrow(NotFoundException);
        });

        it('assembles and returns a valid WeekContainer with resolved blocks', async () => {
            const dbWeek = {
                id: 'W1',
                consultantId: 'C1',
                timezone: 'Africa/Johannesburg',
                weekStart: mockDate,
                version: 1,
                createdAt: mockDate,
                updatedAt: mockDate,
                lastCommittedAt: null,
                sourceOfLastChange: null,
                tasks: [],
                calendarEntries: [],
                slots: [],
                blocks: [
                    { id: 'B1', manuallyResized: true },
                    { id: 'B2', allocation: null },
                    { id: 'B3', allocation: { target: 100 } }
                ],
            };

            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce(dbWeek);

            const result = await service.getWeek('C1', '2026-09-25' as LocalDate);

            expect(result.id).toBe('W1');
            expect(result.lastCommittedAt).toBe(mockDate.toISOString());
            expect(result.sourceOfLastChange).toBe('system');
            expect(result.blocks).toHaveLength(3);
            expect(placerService.blockMinutes).toHaveBeenCalledTimes(1);
            expect(validatorService.summarize).toHaveBeenCalledWith(result);
        });
    });

    describe('commit pipeline', () => {
        let mockWeek: WeekContainer;
        let mockChange: Change;
        let mockCtx: ValidateContext;

        beforeEach(() => {
            mockWeek = {
                id: 'W1',
                consultantId: 'C1',
                weekStart: '2026-09-25' as LocalDate,
                version: 2,
                timezone: 'Africa/Johannesburg',
                tasks: [{ id: 'T1' } as Task],
                blocks: [{ id: 'B1', manuallyResized: true } as unknown as ProjectBlock],
                slots: [{ id: 'S1' } as Slot],
                calendarEntries: [],
                holidays: [],
                metadata: {} as any,
                createdAt: mockDate.toISOString() as Instant,
                updatedAt: mockDate.toISOString() as Instant,
                lastCommittedAt: mockDate.toISOString() as Instant,
                sourceOfLastChange: 'system',
            };
            mockChange = { type: 'replan', window: { start: 'A' as Instant, end: 'B' as Instant } };
            mockCtx = { bumpedEntityIds: [], allocations: [] };
        });

        it('returns early with VERSION_CONFLICT if expectedVersion does not match current', async () => {
            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce({
                ...mockWeek, weekStart: mockDate, createdAt: mockDate, updatedAt: mockDate, lastCommittedAt: mockDate, sourceOfLastChange: 'system'
            });

            const result = await service.commit(mockWeek, mockChange, mockCtx, 1);

            expect(result.ok).toBe(false);
            expect(result.violations[0].code).toBe('VERSION_CONFLICT');
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('returns early without persisting if validation yields violations', async () => {
            mockValidatorService.validate.mockReturnValueOnce({
                issues: [{ level: 'violation', message: 'Bad state' }]
            });

            const result = await service.commit(mockWeek, mockChange, mockCtx, 2);

            expect(result.ok).toBe(false);
            expect(result.violations).toHaveLength(1);
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('does not persist if dryRun is true', async () => {
            const result = await service.commit(mockWeek, mockChange, mockCtx, 2, { dryRun: true });

            expect(result.ok).toBe(true);
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('successfully persists, increments version, and summarizes', async () => {
            const result = await service.commit(mockWeek, mockChange, mockCtx, 2);

            expect(result.ok).toBe(true);
            expect(result.value.version).toBe(3);
            expect(prisma.$transaction).toHaveBeenCalled();
            expect(mockPrisma.schedulerWeek.update).toHaveBeenCalledWith({
                where: { id: 'W1', version: 2 },
                data: expect.objectContaining({ version: { increment: 1 } })
            });
            expect(mockPrisma.schedulerSlot.deleteMany).toHaveBeenCalled();
            expect(mockPrisma.schedulerTask.update).toHaveBeenCalled();
            expect(mockPrisma.schedulerProjectBlock.update).toHaveBeenCalled();
        });

        it('catches Prisma P2025 and returns VERSION_CONFLICT on atomic persist failure', async () => {
            mockPrisma.$transaction.mockRejectedValueOnce({ code: 'P2025' });

            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce({
                ...mockWeek, weekStart: mockDate, createdAt: mockDate, updatedAt: mockDate, lastCommittedAt: mockDate, sourceOfLastChange: 'system'
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
            mockWeek = { id: 'W1', tasks: [], blocks: [], slots: [] } as unknown as WeekContainer;
        });
        it('handles create_task safely returning undefined window', async () => {

            const change: Change = { type: 'create_task', payload: {} as any };
            mockValidatorService.validate.mockReturnValueOnce({ issues: [] });

            await service.commit(mockWeek, change, { bumpedEntityIds: [], allocations: [] });

            expect(placerService.place).not.toHaveBeenCalled();
        });

        it('throws an error on unrecognized change types', async () => {
            const change = { type: 'invalid_type' } as unknown as Change;

            await expect(
                service.commit(mockWeek, change, { bumpedEntityIds: [], allocations: [] })
            ).rejects.toThrow('WeekService.applyChange: unhandled change type "invalid_type"');
        });
    });

    describe('Endpoints (replan & dryRun)', () => {
        const mockDbWeek = {
            id: 'W1', consultantId: 'C1', weekStart: mockDate,
            timezone: 'UTC', version: 1, createdAt: mockDate, updatedAt: mockDate,
            tasks: [], calendarEntries: [], slots: [], blocks: []
        };

        it('replan fetches week, builds window, and commits', async () => {
            mockPrisma.schedulerWeek.findUnique
                .mockResolvedValueOnce(mockDbWeek)
                .mockResolvedValueOnce(mockDbWeek);

            const result = await service.replan('W1', 1);
            expect(result.ok).toBe(true);
            expect(prisma.$transaction).toHaveBeenCalled();
        });

        it('dryRun fetches week and commits with dryRun flag', async () => {
            mockPrisma.schedulerWeek.findUnique
                .mockResolvedValueOnce(mockDbWeek)
                .mockResolvedValueOnce(mockDbWeek);

            const result = await service.dryRun('W1', { type: 'replan', window: {} as any }, 1);
            expect(result.ok).toBe(true);
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('throws NotFoundException if getWeekById cannot find week', async () => {
            mockPrisma.schedulerWeek.findUnique.mockResolvedValueOnce(null);

            await expect(service.replan('INVALID_ID')).rejects.toThrow(NotFoundException);
        });
    });

    describe('move_slot', () => {
        it('throws NotFoundException if slot does not exist', () => {
            const week = { id: 'week-1', slots: [] } as Partial<WeekContainer> as WeekContainer;
            const change: Change = { type: 'move_slot', slotId: 'bad-id', to: mockWindow, origin: 'user', window: mockWindow };

            expect(() => service['applyChange'](week, change)).toThrow(NotFoundException);
        });

        it('moves the slot, locks it, and applies tags', () => {
            const week = {
                id: 'week-1',
                slots: [{ id: 'slot-1', start: '09:00', end: '10:00', locked: false, tags: [] } as Partial<Slot> as Slot],
            } as Partial<WeekContainer> as WeekContainer;

            const change: Change = {
                type: 'move_slot',
                slotId: 'slot-1',
                to: { start: '12:00', end: '13:00' },
                tags: ['extended-hours'],
                origin: 'user',
                window: mockWindow,
            };

            const resultWindow = service['applyChange'](week, change);

            expect(resultWindow).toEqual(mockWindow);
            expect(week.slots[0].start).toBe('12:00');
            expect(week.slots[0].end).toBe('13:00');
            expect(week.slots[0].locked).toBe(true);
            expect(week.slots[0].tags).toEqual(['extended-hours']);
        });
    });

    describe('move_block', () => {
        it('throws NotFoundException if block does not exist', () => {
            const week = { id: 'week-1', blocks: [] } as Partial<WeekContainer> as WeekContainer;
            const change: Change = { type: 'move_block', blockId: 'bad-id', to: mockWindow, origin: 'user', window: mockWindow };

            expect(() => service['applyChange'](week, change)).toThrow(NotFoundException);
        });

        it('updates block boundaries without altering mobility', () => {
            const week = {
                id: 'week-1',
                blocks: [{ id: 'block-1', start: '09:00', end: '10:00', mobility: 'fluid' } as Partial<ProjectBlock> as ProjectBlock],
            } as Partial<WeekContainer> as WeekContainer;

            const change: Change = {
                type: 'move_block',
                blockId: 'block-1',
                to: { start: '12:00', end: '13:00' },
                origin: 'user',
                window: mockWindow,
            };

            service['applyChange'](week, change);

            expect(week.blocks[0].start).toBe('12:00');
            expect(week.blocks[0].end).toBe('13:00');
            expect(week.blocks[0].mobility).toBe('fluid');
        });
    });

    describe('resize_block', () => {
        it('updates boundaries and marks the block as userSized', () => {
            const week = {
                id: 'week-1',
                blocks: [{ id: 'block-1', start: '09:00', end: '10:00' } as Partial<ProjectBlock> as ProjectBlock],
            } as Partial<WeekContainer> as WeekContainer;

            const change: Change = {
                type: 'resize_block',
                blockId: 'block-1',
                to: { start: '09:00', end: '15:00' },
                origin: 'user',
                window: mockWindow,
            };

            service['applyChange'](week, change);

            expect(week.blocks[0].start).toBe('09:00');
            expect(week.blocks[0].end).toBe('15:00');

            expect((week.blocks[0] as ProjectBlock & { userSized?: boolean }).userSized).toBe(true);
        });
    });

    describe('pin_block', () => {
        it('toggles mobility to pinned when pinned is true', () => {
            const week = {
                id: 'week-1',
                blocks: [{ id: 'block-1', mobility: 'fluid' } as Partial<ProjectBlock> as ProjectBlock],
            } as Partial<WeekContainer> as WeekContainer;

            const change: Change = { type: 'pin_block', blockId: 'block-1', pinned: true, origin: 'user', window: mockWindow };

            service['applyChange'](week, change);

            expect(week.blocks[0].mobility).toBe('pinned');
        });

        it('toggles mobility to fluid when pinned is false', () => {
            const week = {
                id: 'week-1',
                blocks: [{ id: 'block-1', mobility: 'pinned' } as Partial<ProjectBlock> as ProjectBlock],
            } as Partial<WeekContainer> as WeekContainer;

            const change: Change = { type: 'pin_block', blockId: 'block-1', pinned: false, origin: 'user', window: mockWindow };

            service['applyChange'](week, change);

            expect(week.blocks[0].mobility).toBe('fluid');
        });
    });
});