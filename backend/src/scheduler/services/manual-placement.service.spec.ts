import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ManualPlacementService } from './manual-placement.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService } from './week.service';
import { TimeService, LocalDate } from './time.service';
import { WeekContainer, Interval } from '../dto/scheduler.dto';

describe('ManualPlacementService', () => {
    let service: ManualPlacementService;
    let weekService: jest.Mocked<WeekService>;
    let timeService: jest.Mocked<TimeService>;
    let prisma: any;

    const mockWeek: Partial<WeekContainer> = {
        id: 'week-1',
        consultantId: 'cons-1',
        timezone: 'Africa/Johannesburg',
        weekStart: '2026-09-28' as LocalDate,
    };

    const targetInterval: Interval = {
        start: '2026-09-28T10:00:00Z',
        end: '2026-09-28T11:00:00Z',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ManualPlacementService,
                {
                    provide: PrismaService,
                    useValue: {
                        schedulerSlot: { findUnique: jest.fn() },
                        schedulerProjectBlock: { findUnique: jest.fn() },
                    },
                },
                {
                    provide: WeekService,
                    useValue: {
                        getWeek: jest.fn().mockResolvedValue(mockWeek),
                        commit: jest.fn().mockResolvedValue({ ok: true, value: mockWeek }),
                    },
                },
                {
                    provide: TimeService,
                    useValue: {
                        isRangeInCoreHours: jest.fn().mockReturnValue(true),
                        localDate: jest.fn().mockReturnValue('2026-09-28'),
                        localDateToInstant: jest.fn().mockImplementation((date) => `${date}T00:00:00Z`),
                    },
                },
            ],
        }).compile();

        service = module.get(ManualPlacementService);
        weekService = module.get(WeekService);
        timeService = module.get(TimeService);
        prisma = module.get(PrismaService);
    });

    describe('moveSlot', () => {
        it('throws NotFoundException if slot does not exist', async () => {
            prisma.schedulerSlot.findUnique.mockResolvedValue(null);
            await expect(service.moveSlot('bad-id', targetInterval)).rejects.toThrow(NotFoundException);
        });

        it('dispatches move_slot change with correct context and window', async () => {
            prisma.schedulerSlot.findUnique.mockResolvedValue({
                id: 'slot-1',
                week: { consultantId: 'cons-1', weekStart: new Date('2026-09-28T00:00:00Z') },
            });

            await service.moveSlot('slot-1', targetInterval, false, 42);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({
                    type: 'move_slot',
                    slotId: 'slot-1',
                    to: targetInterval,
                    origin: 'user',
                    tags: undefined,
                    window: { start: '2026-09-28T00:00:00Z', end: '2026-09-29T00:00:00Z' },
                }),
                expect.objectContaining({ bumpedEntityIds: ['slot-1'] }),
                42
            );
        });

        it('injects tags when moved out of hours with confirmedOverride', async () => {
            prisma.schedulerSlot.findUnique.mockResolvedValue({
                id: 'slot-1',
                week: { consultantId: 'cons-1', weekStart: new Date('2026-09-28T00:00:00Z') },
            });

            timeService.isRangeInCoreHours.mockReturnValue(false);

            await service.moveSlot('slot-1', targetInterval, true);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({
                    tags: ['extended-hours'],
                }),
                expect.any(Object),
                undefined
            );
        });
    });

    describe('moveBlock', () => {
        it('throws NotFoundException if block does not exist', async () => {
            prisma.schedulerProjectBlock.findUnique.mockResolvedValue(null);
            await expect(service.moveBlock('bad-id', targetInterval)).rejects.toThrow(NotFoundException);
        });

        it('dispatches move_block change successfully', async () => {
            prisma.schedulerProjectBlock.findUnique.mockResolvedValue({
                id: 'block-1',
                week: { consultantId: 'cons-1', weekStart: new Date('2026-09-28T00:00:00Z') },
            });

            await service.moveBlock('block-1', targetInterval, true, 10);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'move_block', blockId: 'block-1', to: targetInterval, confirmedOverride: true }),
                expect.objectContaining({ bumpedEntityIds: ['block-1'] }),
                10
            );
        });
    });

    describe('resizeBlock', () => {
        it('dispatches resize_block change successfully', async () => {
            prisma.schedulerProjectBlock.findUnique.mockResolvedValue({
                id: 'block-2',
                week: { consultantId: 'cons-1', weekStart: new Date('2026-09-28T00:00:00Z') },
            });

            await service.resizeBlock('block-2', targetInterval);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'resize_block', blockId: 'block-2', to: targetInterval }),
                expect.objectContaining({ bumpedEntityIds: ['block-2'] }),
                undefined
            );
        });
    });

    describe('pinBlock', () => {
        it('dispatches pin_block change calculating window from existing block start', async () => {
            prisma.schedulerProjectBlock.findUnique.mockResolvedValue({
                id: 'block-3',
                start: new Date('2026-09-29T10:00:00Z'), // Tuesday
                week: { consultantId: 'cons-1', weekStart: new Date('2026-09-28T00:00:00Z') },
            });

            timeService.localDate.mockReturnValue('2026-09-29' as LocalDate);

            await service.pinBlock('block-3', true);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'pin_block', blockId: 'block-3', pinned: true }),
                expect.objectContaining({ bumpedEntityIds: ['block-3'] }),
                undefined
            );

            expect(timeService.localDate).toHaveBeenCalledWith('2026-09-29T10:00:00.000Z', 'Africa/Johannesburg');
        });
    });
});