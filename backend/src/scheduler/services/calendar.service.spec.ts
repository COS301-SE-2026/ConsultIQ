import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService } from './week.service';
import { TimeService, LocalDate } from './time.service';
import { CalendarEntryDto, ReasonCode } from '../dto/scheduler.dto';

describe('CalendarService', () => {
    let service: CalendarService;
    let weekService: jest.Mocked<WeekService>;
    let timeService: jest.Mocked<TimeService>;
    let prisma: any;

    const mockWeek: Partial<Awaited<ReturnType<WeekService['getWeek']>>> = {
        id: 'week-1',
        consultantId: 'cons-1',
        timezone: 'Africa/Johannesburg',
        weekStart: '2026-09-28' as LocalDate, // Monday
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CalendarService,
                {
                    provide: PrismaService,
                    useValue: {
                        schedulerCalendarEntry: { findUnique: jest.fn() },
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
                        isRangeInCoreHours: jest.fn(),
                        localDate: jest.fn().mockReturnValue('2026-09-28'),
                        localDateToInstant: jest.fn().mockImplementation((date) => `${date}T00:00:00Z`),
                    },
                },
            ],
        }).compile();

        service = module.get(CalendarService);
        weekService = module.get(WeekService);
        timeService = module.get(TimeService);
        prisma = module.get(PrismaService);
    });

    describe('upsert', () => {
        it('rejects public holiday modifications gracefully', async () => {
            const entry: CalendarEntryDto = {
                type: 'leave',
                start: '2026-09-28T08:00:00Z',
                end: '2026-09-28T17:00:00Z',
                tags: [],
                origin: 'public-holiday',
            };

            const result = await service.upsert('cons-1', '2026-09-28' as LocalDate, entry);

            expect(result.ok).toBe(false);
            expect(result.violations[0].code).toBe('HOLIDAY_ENTRY_IMMUTABLE' as ReasonCode);
            expect(weekService.commit).not.toHaveBeenCalled();
        });

        it('injects extended-hours tag when out of hours on a weekday and confirmedOverride is true', async () => {
            const entry: CalendarEntryDto = {
                type: 'meeting',
                start: '2026-09-28T19:00:00Z',
                end: '2026-09-28T20:00:00Z',
                tags: [],
                origin: 'user',
                confirmedOverride: true,
            };

            timeService.isRangeInCoreHours.mockReturnValue(false);

            await service.upsert('cons-1', '2026-09-28' as LocalDate, entry);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({
                    type: 'calendar_upsert',
                    entry: expect.objectContaining({ tags: ['extended-hours'] })
                }),
                expect.any(Object),
                undefined
            );
        });

        it('injects weekend tag when out of hours on a weekend and confirmedOverride is true', async () => {
            const entry: CalendarEntryDto = {
                type: 'meeting',
                start: '2026-09-26T10:00:00Z',
                end: '2026-09-26T11:00:00Z',
                tags: [],
                origin: 'user',
                confirmedOverride: true,
            };

            timeService.isRangeInCoreHours.mockReturnValue(false);
            timeService.localDate.mockReturnValue('2026-09-26' as LocalDate);

            await service.upsert('cons-1', '2026-09-28' as LocalDate, entry);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({
                    entry: expect.objectContaining({ tags: ['weekend'] })
                }),
                expect.any(Object),
                undefined
            );
        });

        it('does NOT inject tags if out of hours but confirmedOverride is missing', async () => {
            const entry: CalendarEntryDto = {
                type: 'meeting',
                start: '2026-09-28T19:00:00Z',
                end: '2026-09-28T20:00:00Z',
                tags: [],
                origin: 'user',
            };

            timeService.isRangeInCoreHours.mockReturnValue(false);

            await service.upsert('cons-1', '2026-09-28' as LocalDate, entry);
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({
                    entry: expect.objectContaining({ tags: [] })
                }),
                expect.any(Object),
                undefined
            );
        });

        it('correctly calculates the day window constraint', async () => {
            const entry: CalendarEntryDto = {
                type: 'meeting',
                start: '2026-09-28T10:00:00Z',
                end: '2026-09-28T11:00:00Z',
                tags: [],
                origin: 'user',
            };

            timeService.isRangeInCoreHours.mockReturnValue(true);

            await service.upsert('cons-1', '2026-09-28' as LocalDate, entry);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({
                    window: {
                        start: '2026-09-28T00:00:00Z',
                        end: '2026-09-29T00:00:00Z', // Validates midnight-to-midnight calculation
                    }
                }),
                expect.any(Object),
                undefined
            );
        });
    });

    describe('remove', () => {
        it('throws NotFoundException if entry does not exist', async () => {
            prisma.schedulerCalendarEntry.findUnique.mockResolvedValue(null);

            await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
        });

        it('rejects public holiday deletions gracefully', async () => {
            prisma.schedulerCalendarEntry.findUnique.mockResolvedValue({
                id: 'hol-1',
                origin: 'public-holiday',
                week: { consultantId: 'cons-1', weekStart: new Date('2026-09-28T00:00:00Z') }
            });

            const result = await service.remove('hol-1');

            expect(result.ok).toBe(false);
            expect(result.violations[0].code).toBe('HOLIDAY_ENTRY_IMMUTABLE' as ReasonCode);
            expect(weekService.commit).not.toHaveBeenCalled();
        });

        it('successfully triggers a commit with the correct window on removal', async () => {
            prisma.schedulerCalendarEntry.findUnique.mockResolvedValue({
                id: 'entry-1',
                origin: 'user',
                start: new Date('2026-09-28T10:00:00Z'),
                week: { consultantId: 'cons-1', weekStart: new Date('2026-09-28T00:00:00Z') }
            });

            await service.remove('entry-1', 42);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({
                    type: 'calendar_remove',
                    entryId: 'entry-1',
                    origin: 'user',
                    window: {
                        start: '2026-09-28T00:00:00Z',
                        end: '2026-09-29T00:00:00Z',
                    }
                }),
                expect.any(Object),
                42
            );
        });
    });
});