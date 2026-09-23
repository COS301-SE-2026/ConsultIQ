import { Test, TestingModule } from '@nestjs/testing';
import { HolidayService } from './holiday.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
    publicHoliday: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
    },
};

describe('HolidayService', () => {
    let service: HolidayService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HolidayService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<HolidayService>(HolidayService);
        prisma = module.get<PrismaService>(PrismaService);
        jest.clearAllMocks();
    });

    describe('getForDate', () => {
        it('should return a mapped holiday if it exists', async () => {
            const dbHoliday = {
                id: '123',
                date: new Date('2026-12-25T00:00:00.000Z'),
                name: 'Christmas Day',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            };

            mockPrismaService.publicHoliday.findFirst.mockResolvedValue(dbHoliday);

            const result = await service.getForDate('2026-12-25');

            expect(prisma.publicHoliday.findFirst).toHaveBeenCalledWith({
                where: { date: new Date('2026-12-25T00:00:00.000Z') },
            });
            expect(result).toEqual({
                id: '123',
                date: '2026-12-25',
                name: 'Christmas Day',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            });
        });

        it('should return null if no holiday is found', async () => {
            mockPrismaService.publicHoliday.findFirst.mockResolvedValue(null);

            const result = await service.getForDate('2026-09-22');

            expect(result).toBeNull();
        });
    });

    describe('getForWeek', () => {
        it('should query a 7-day span and return mapped holidays', async () => {
            const dbHolidays = [
                {
                    id: '1',
                    date: new Date('2026-12-25T00:00:00.000Z'),
                    name: 'Christmas Day',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: '2',
                    date: new Date('2026-12-26T00:00:00.000Z'),
                    name: 'Day of Goodwill',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            ];

            mockPrismaService.publicHoliday.findMany.mockResolvedValue(dbHolidays);

            const result = await service.getForWeek('2026-12-21');

            expect(prisma.publicHoliday.findMany).toHaveBeenCalledWith({
                where: {
                    date: {
                        gte: new Date('2026-12-21T00:00:00.000Z'),
                        lt: new Date('2026-12-28T00:00:00.000Z'), // 7 days later exclusive
                    }
                },
                orderBy: { date: 'asc' }
            });

            expect(result.length).toBe(2);
            expect(result[0].date).toBe('2026-12-25');
            expect(result[1].date).toBe('2026-12-26');
        });
    });
});