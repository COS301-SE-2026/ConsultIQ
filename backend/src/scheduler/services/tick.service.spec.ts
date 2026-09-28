import { Test, TestingModule } from '@nestjs/testing';
import { TickService } from './tick.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService } from './week.service';
import { RolloverService } from './rollover.service';
import { AdvisoryService } from './advisory.service';
import { TimeService, LocalDate, Instant } from './time.service';
import { NotFoundException } from '@nestjs/common';
import { Settings } from 'luxon';
import { WeekContainer } from '../dto/scheduler.dto';

jest.mock('@nestjs/schedule', () => ({
    Cron: () => () => { },
}));


jest.mock('./scheduler-rules.constant', () => ({
    SCHEDULER_RULES: {
        WEEKLY_TICK_DAY: 0,
        WEEKLY_TICK_TIME: '00:00',
        DAILY_TICK_TIME: '07:30',
    }
}));

describe('TickService', () => {
    let service: TickService;
    let prisma: any;
    let weekService: any;
    let rolloverService: any;
    let advisoryService: any;
    let timeService: any;

    beforeEach(async () => {
        prisma = {
            schedulerWeek: { findMany: jest.fn() },
            schedulerIdempotencyKey: { create: jest.fn(), deleteMany: jest.fn() }
        };

        weekService = {
            getWeek: jest.fn(),
            commit: jest.fn()
        };

        rolloverService = {
            markIncomplete: jest.fn()
        };

        advisoryService = {
            buildSuggestions: jest.fn()
        };

        timeService = {
            localDateToInstant: jest.fn((date) => `${date}T00:00:00Z` as Instant)
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TickService,
                { provide: PrismaService, useValue: prisma },
                { provide: WeekService, useValue: weekService },
                { provide: RolloverService, useValue: rolloverService },
                { provide: AdvisoryService, useValue: advisoryService },
                { provide: TimeService, useValue: timeService },
            ],
        }).compile();

        service = module.get(TickService);
    });

    afterEach(() => {
        // Reset Luxon time mock
        Settings.now = () => Date.now();
        jest.clearAllMocks();
    });

    describe('handleTicks (Cron trigger)', () => {
        it('fetches distinct active consultants and processes them', async () => {
            prisma.schedulerWeek.findMany.mockResolvedValue([
                { consultantId: 'C1', timezone: 'Africa/Johannesburg' },
                { consultantId: 'C2', timezone: 'UTC' }
            ]);

            const processSpy = jest.spyOn(service as any, 'processConsultant').mockResolvedValue(undefined);

            await service.handleTicks();

            expect(prisma.schedulerWeek.findMany).toHaveBeenCalled();
            expect(processSpy).toHaveBeenCalledTimes(2);
            expect(processSpy).toHaveBeenCalledWith('C1', 'Africa/Johannesburg');
            expect(processSpy).toHaveBeenCalledWith('C2', 'UTC');
        });

        it('continues processing if one consultant throws an error', async () => {
            prisma.schedulerWeek.findMany.mockResolvedValue([
                { consultantId: 'C1', timezone: 'Africa/Johannesburg' },
                { consultantId: 'C2', timezone: 'UTC' }
            ]);

            const processSpy = jest.spyOn(service as any, 'processConsultant')
                .mockRejectedValueOnce(new Error('Crash'))
                .mockResolvedValueOnce(undefined);

            await service.handleTicks();

            expect(processSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('processConsultant (Time evaluation)', () => {
        it('triggers daily tick on a weekday at exactly 07:30 local time', async () => {
            Settings.now = () => new Date('2026-09-23T07:30:00.000Z').valueOf();

            const dailySpy = jest.spyOn(service as any, 'tryRunDailyTick').mockResolvedValue(undefined);
            const weeklySpy = jest.spyOn(service as any, 'tryRunWeeklyTick').mockResolvedValue(undefined);

            await service['processConsultant']('C1', 'UTC');

            expect(dailySpy).toHaveBeenCalledWith('C1', 'UTC', '2026-09-23');
            expect(weeklySpy).not.toHaveBeenCalled();
        });

        it('triggers weekly tick on Sunday at exactly 00:00 local time', async () => {
            Settings.now = () => new Date('2026-09-27T00:00:00.000Z').valueOf();

            const dailySpy = jest.spyOn(service as any, 'tryRunDailyTick').mockResolvedValue(undefined);
            const weeklySpy = jest.spyOn(service as any, 'tryRunWeeklyTick').mockResolvedValue(undefined);

            await service['processConsultant']('C1', 'UTC');

            expect(weeklySpy).toHaveBeenCalledWith('C1', 'UTC', '2026-09-27');
            expect(dailySpy).not.toHaveBeenCalled();
        });

        it('triggers tick 30 minutes after target time (fallback buffer)', async () => {
            Settings.now = () => new Date('2026-09-23T08:00:00.000Z').valueOf();

            const dailySpy = jest.spyOn(service as any, 'tryRunDailyTick').mockResolvedValue(undefined);

            await service['processConsultant']('C1', 'UTC');

            expect(dailySpy).toHaveBeenCalled();
        });

        it('does nothing at random times', async () => {

            Settings.now = () => new Date('2026-09-23T14:15:00.000Z').valueOf();

            const dailySpy = jest.spyOn(service as any, 'tryRunDailyTick').mockResolvedValue(undefined);

            await service['processConsultant']('C1', 'UTC');

            expect(dailySpy).not.toHaveBeenCalled();
        });
    });

    describe('Idempotency logic (tryRunDailyTick)', () => {
        it('bypasses execution if idempotency lock cannot be acquired (already ran)', async () => {
            prisma.schedulerIdempotencyKey.create.mockRejectedValue({ code: 'P2002' });
            const dailySpy = jest.spyOn(service as any, 'dailyTick');

            await service['tryRunDailyTick']('C1', 'UTC', '2026-09-23' as LocalDate);

            expect(dailySpy).not.toHaveBeenCalled();
        });

        it('releases the lock if dailyTick throws an error', async () => {
            prisma.schedulerIdempotencyKey.create.mockResolvedValue({ id: 1 });
            jest.spyOn(service as any, 'dailyTick').mockRejectedValue(new Error('Tick failed'));

            await expect(service['tryRunDailyTick']('C1', 'UTC', '2026-09-23' as LocalDate)).rejects.toThrow('Tick failed');

            expect(prisma.schedulerIdempotencyKey.deleteMany).toHaveBeenCalledWith({
                where: { key: 'tick:daily:C1:2026-09-23', type: 'daily_tick' }
            });
        });
    });

    describe('dailyTick logic', () => {
        let mockWeek: WeekContainer;

        beforeEach(() => {
            mockWeek = { id: 'W1' } as WeekContainer;
            weekService.getWeek.mockResolvedValue(mockWeek);
            rolloverService.markIncomplete.mockResolvedValue({ ok: true });
            weekService.commit.mockResolvedValue({ ok: true, value: mockWeek });
        });

        it('returns early if consultant has no week container', async () => {
            weekService.getWeek.mockRejectedValue(new NotFoundException());
            await service['dailyTick']('C1', 'UTC', '2026-09-23' as LocalDate);
            expect(rolloverService.markIncomplete).not.toHaveBeenCalled();
        });

        it('executes rollover, replan, and builds suggestions', async () => {
            await service['dailyTick']('C1', 'UTC', '2026-09-23' as LocalDate);

            expect(rolloverService.markIncomplete).toHaveBeenCalledWith('C1', '2026-09-22');
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'replan' }),
                { bumpedEntityIds: [], allocations: [] }
            );

            expect(advisoryService.buildSuggestions).toHaveBeenCalledWith(mockWeek);
        });
    });

    describe('weeklyTick logic', () => {
        it('re-plans the entirety of the upcoming week', async () => {
            const mockNextWeek = { id: 'W2' } as WeekContainer;
            weekService.getWeek.mockResolvedValue(mockNextWeek);
            weekService.commit.mockResolvedValue({ ok: true, value: mockNextWeek });
            await service['weeklyTick']('C1', 'UTC', '2026-09-27' as LocalDate);

            expect(weekService.getWeek).toHaveBeenCalledWith('C1', '2026-09-28');
            expect(weekService.commit).toHaveBeenCalledWith(
                mockNextWeek,
                expect.objectContaining({ type: 'replan' }),
                { bumpedEntityIds: [], allocations: [] }
            );
        });
    });

    describe('Warning Loggers and NotFoundException catching', () => {
        let loggerWarnSpy: jest.SpyInstance;

        beforeEach(() => {
            loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
        });

        it('logs a warning if rolloverService.markIncomplete returns ok: false', async () => {
            jest.spyOn(service as any, 'acquireIdempotency').mockResolvedValue(true);
            rolloverService.markIncomplete.mockResolvedValue({ ok: false, message: 'Lock error' } as any);
            weekService.commit.mockResolvedValue({ ok: true } as any);

            await service['dailyTick']('cons-1', 'UTC', '2026-09-26' as any);

            expect(loggerWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('markIncomplete failed for cons-1')
            );
        });

        it('logs a warning if a daily/weekly replan commit is rejected (ok: false)', async () => {
            jest.spyOn(service as any, 'acquireIdempotency').mockResolvedValue(true);
            rolloverService.markIncomplete.mockResolvedValue({ ok: true } as any);
            weekService.commit.mockResolvedValue({
                ok: false,
                violations: [{ code: 'HARD_CAP_BREACH' }]
            } as any);

            await service['dailyTick']('cons-1', 'UTC', '2026-09-26' as any);

            expect(loggerWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('was rejected: HARD_CAP_BREACH')
            );
        });

        it('silently catches NotFoundException and returns', async () => {
            jest.spyOn(service as any, 'acquireIdempotency').mockResolvedValue(true);

            const { NotFoundException } = require('@nestjs/common');
            weekService.getWeek.mockRejectedValue(new NotFoundException('Week missing'));
            await expect(service['dailyTick']('cons-1', 'UTC', '2026-09-26' as any)).resolves.toBeUndefined();
        });
    });

    describe('Idempotency Management', () => {
        it('acquireIdempotency returns false if Prisma throws a P2002 (duplicate lock) error', async () => {
            prisma.schedulerIdempotencyKey.create.mockRejectedValue({ code: 'P2002' });
            const result = await service['acquireIdempotency']('test-key', 'weekly_tick');
            expect(result).toBe(false);
        });

        it('acquireIdempotency re-throws non-P2002 errors', async () => {
            const unknownError = new Error('Database down');
            prisma.schedulerIdempotencyKey.create.mockRejectedValue(unknownError);

            await expect(service['acquireIdempotency']('test-key', 'weekly_tick')).rejects.toThrow('Database down');
        });

        it('releaseIdempotency silently catches and swallows errors', async () => {
            prisma.schedulerIdempotencyKey.deleteMany.mockRejectedValue(new Error('Delete failed'));

            await expect(service['releaseIdempotency']('test-key', 'weekly_tick')).resolves.toBeUndefined();
        });
    });

    describe('tryRunWeeklyTick error handling', () => {
        it('releases the idempotency lock and re-throws if weeklyTick fails', async () => {
            const acquireSpy = jest.spyOn(service as any, 'acquireIdempotency').mockResolvedValue(true);
            const releaseSpy = jest.spyOn(service as any, 'releaseIdempotency').mockResolvedValue(undefined);
            jest.spyOn(service as any, 'weeklyTick').mockRejectedValue(new Error('Crash during tick'));

            await expect(service['tryRunWeeklyTick']('cons-1', 'UTC', '2026-09-26' as any))
                .rejects.toThrow('Crash during tick');
            expect(releaseSpy).toHaveBeenCalledWith('tick:weekly:cons-1:2026-09-26', 'weekly_tick');
        });
    });
});