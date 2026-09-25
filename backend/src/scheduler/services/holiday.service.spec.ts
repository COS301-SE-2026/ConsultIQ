import { Test, TestingModule } from '@nestjs/testing';
import { HolidayService } from './holiday.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, Logger } from '@nestjs/common';
import { PublicHoliday as PrismaPublicHoliday } from '@prisma/client';

describe('HolidayService', () => {
    let service: HolidayService;
    let prisma: PrismaService;
    let loggerWarnSpy: jest.SpyInstance;

    const mockPrismaService = {
        publicHoliday: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
    };

    const mockDbHoliday: PrismaPublicHoliday = {
        id: 'h1',
        date: new Date('2026-12-25T00:00:00Z'),
        name: 'Christmas Day',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HolidayService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<HolidayService>(HolidayService);
        prisma = module.get<PrismaService>(PrismaService);
        loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getForDate', () => {
        it('should return a mapped holiday if found', async () => {
            mockPrismaService.publicHoliday.findFirst.mockResolvedValue(mockDbHoliday);

            const result = await service.getForDate('2026-12-25');

            expect(result).not.toBeNull();
            expect(result!.id).toBe('h1');
            expect(result!.name).toBe('Christmas Day');
            expect(result!.date).toBe('2026-12-25');
        });

        it('should return null if no holiday is found', async () => {
            mockPrismaService.publicHoliday.findFirst.mockResolvedValue(null);

            const result = await service.getForDate('2026-09-21');
            expect(result).toBeNull();
        });

        it('should throw BadRequestException on invalid date format', async () => {
            await expect(service.getForDate('invalid-date')).rejects.toThrow(BadRequestException);
        });
    });

    describe('getForWeek', () => {
        it('should return mapped holidays without warning if holidays exist in the week', async () => {
            mockPrismaService.publicHoliday.findMany.mockResolvedValue([mockDbHoliday]);


            const result = await service.getForWeek('2026-12-21');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('h1');
            expect(result[0].date).toBe('2026-12-25');
            expect(loggerWarnSpy).not.toHaveBeenCalled();
        });

        it('should log a warning if no holidays exist for the week AND the year is completely unseeded', async () => {
            mockPrismaService.publicHoliday.findMany.mockResolvedValue([]); // No holidays this week
            mockPrismaService.publicHoliday.count.mockResolvedValue(0); // No holidays this year

            // 2026-09-21 is a Monday
            const result = await service.getForWeek('2026-09-21');

            expect(result).toHaveLength(0);
            expect(mockPrismaService.publicHoliday.count).toHaveBeenCalledTimes(1);
            expect(loggerWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('No public holiday data is seeded for 2026')
            );
        });

        it('should NOT log a warning if no holidays exist for the week BUT the year has holidays seeded', async () => {
            mockPrismaService.publicHoliday.findMany.mockResolvedValue([]); // No holidays this week
            mockPrismaService.publicHoliday.count.mockResolvedValue(12); // Year is seeded with 12 holidays

            // 2026-09-21 is a Monday
            const result = await service.getForWeek('2026-09-21');

            expect(result).toHaveLength(0);
            expect(mockPrismaService.publicHoliday.count).toHaveBeenCalledTimes(1);
            expect(loggerWarnSpy).not.toHaveBeenCalled(); // Warning should be skipped
        });

        it('should throw BadRequestException if weekStart is not a Monday', async () => {
            // 2026-09-22 is a Tuesday
            await expect(service.getForWeek('2026-09-22')).rejects.toThrow(
                new BadRequestException('weekStart must be a Monday, got 2026-09-22')
            );
        });

        it('should throw BadRequestException on invalid date string', async () => {
            await expect(service.getForWeek('2026/09/21')).rejects.toThrow(BadRequestException);
        });
    });
});