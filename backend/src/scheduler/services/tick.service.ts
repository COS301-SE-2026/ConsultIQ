import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService } from './week.service';
import { RolloverService } from './rollover.service';
import { AdvisoryService } from './advisory.service';
import { TimeService, LocalDate } from './time.service';
import { SCHEDULER_RULES } from './scheduler-rules.constant';
import { Change, Interval, WeekContainer, ValidateContext } from '../dto/scheduler.dto';
import { IdempotencyKeyType } from '@prisma/client';

@Injectable()
export class TickService {
    private readonly logger = new Logger(TickService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly weekService: WeekService,
        private readonly rolloverService: RolloverService,
        private readonly timeService: TimeService,
        private readonly advisoryService: AdvisoryService,
    ) { }

    // -----------------------------------------------------------------
    // Central trigger (every 30 minutes)
    // -----------------------------------------------------------------

    @Cron('0,30 * * * *')
    public async handleTicks(): Promise<void> {
        this.logger.debug('Evaluating timezone ticks for all active consultants...');

        const activeWeeks = await this.prisma.schedulerWeek.findMany({
            select: { consultantId: true, timezone: true },
            distinct: ['consultantId'],
        });

        for (const { consultantId, timezone } of activeWeeks) {
            try {
                await this.processConsultant(consultantId, timezone);
            } catch (error) {
                this.logger.error(`Failed to process ticks for consultant ${consultantId}:`, error);
            }
        }
    }

    private async processConsultant(consultantId: string, timezone: string): Promise<void> {
        const now = DateTime.now().setZone(timezone);
        const localTime = now.toFormat('HH:mm');
        const localDate = now.toFormat('yyyy-MM-dd') as LocalDate;
        const weekday = now.weekday;

        if (weekday === this.weeklyTickWeekday() && this.isAtOrJustAfter(localTime, SCHEDULER_RULES.WEEKLY_TICK_TIME)) {
            await this.tryRunWeeklyTick(consultantId, timezone, localDate);
        }

        if (weekday >= 1 && weekday <= 5 && this.isAtOrJustAfter(localTime, SCHEDULER_RULES.DAILY_TICK_TIME)) {
            await this.tryRunDailyTick(consultantId, timezone, localDate);
        }
    }
    private async tryRunDailyTick(consultantId: string, timezone: string, localDate: LocalDate): Promise<void> {
        const idempotencyKey = 'tick:daily:' + consultantId + ':' + localDate;
        const acquired = await this.acquireIdempotency(idempotencyKey, 'daily_tick');
        if (!acquired) return;

        this.logger.log('Running daily tick for ' + consultantId + ' at ' + localDate);
        try {
            await this.dailyTick(consultantId, timezone, localDate);
        } catch (error) {
            await this.releaseIdempotency(idempotencyKey, 'daily_tick');
            throw error;
        }
    }

    private async tryRunWeeklyTick(consultantId: string, timezone: string, localDate: LocalDate): Promise<void> {
        const idempotencyKey = 'tick:weekly:' + consultantId + ':' + localDate;
        const acquired = await this.acquireIdempotency(idempotencyKey, 'weekly_tick');
        if (!acquired) return;

        this.logger.log('Running weekly tick for ' + consultantId + ' at ' + localDate);
        try {
            await this.weeklyTick(consultantId, timezone, localDate);
        } catch (error) {
            await this.releaseIdempotency(idempotencyKey, 'weekly_tick');
            throw error;
        }
    }

    private async dailyTick(consultantId: string, timezone: string, today: LocalDate): Promise<void> {
        const dt = DateTime.fromISO(today as string, { zone: timezone });
        const weekStart = dt.startOf('week').toFormat('yyyy-MM-dd') as LocalDate;
        const yesterday = dt.minus({ days: 1 }).toFormat('yyyy-MM-dd') as LocalDate;

        let week: WeekContainer;
        try {
            week = await this.weekService.getWeek(consultantId, weekStart);
        } catch (error) {
            if (error instanceof NotFoundException) {
                return;
            }
            throw error;
        }

        const markResult = await this.rolloverService.markIncomplete(consultantId, yesterday);
        if (!markResult.ok) {
            this.logger.warn(`markIncomplete failed for ${consultantId} on ${yesterday}: ${markResult.message}`);
        }

        week = await this.weekService.getWeek(consultantId, weekStart);

        const nextDay = dt.plus({ days: 1 }).toFormat('yyyy-MM-dd') as LocalDate;
        const todayWindow: Interval = {
            start: this.timeService.localDateToInstant(today, timezone),
            end: this.timeService.localDateToInstant(nextDay, timezone),
        };

        const change: Change = { type: 'replan', window: todayWindow, origin: 'system' } as Change;
        const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };

        const replanResult = await this.weekService.commit(week, change, ctx);

        if (!replanResult.ok) {
            this.logger.warn(
                `Daily replan for ${consultantId} on ${today} was rejected: ` +
                `${replanResult.violations.map((v) => v.code).join(', ')}`,
            );
        }

        const finalWeek = replanResult.ok ? replanResult.value : await this.weekService.getWeek(consultantId, weekStart);
        await this.advisoryService.buildSuggestions(finalWeek);
    }

    private async weeklyTick(consultantId: string, timezone: string, today: LocalDate): Promise<void> {

        const nextWeekStart = DateTime.fromISO(today as string, { zone: timezone })
            .plus({ days: 1 }).toFormat('yyyy-MM-dd') as LocalDate;

        let nextWeek: WeekContainer;
        try {
            nextWeek = await this.weekService.getWeek(consultantId, nextWeekStart);
        } catch (error) {
            if (error instanceof NotFoundException) {
                return;
            }
            throw error;
        }

        const followingMonday = DateTime.fromISO(nextWeekStart as string, { zone: timezone })
            .plus({ days: 7 }).toFormat('yyyy-MM-dd') as LocalDate;

        const wholeWeekWindow: Interval = {
            start: this.timeService.localDateToInstant(nextWeekStart, timezone),
            end: this.timeService.localDateToInstant(followingMonday, timezone),
        };

        const change: Change = { type: 'replan', window: wholeWeekWindow, origin: 'system' } as Change;
        const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };

        const result = await this.weekService.commit(nextWeek, change, ctx);

        if (!result.ok) {

            this.logger.warn(
                `Weekly cold-start replan for ${consultantId} (week of ${nextWeekStart}) was rejected: ` +
                `${result.violations.map((v) => v.code).join(', ')}`,
            );
        }
    }

    // -----------------------------------------------------------------
    // Tick-time helpers
    // -----------------------------------------------------------------

    private weeklyTickWeekday(): number {
        const day = SCHEDULER_RULES.WEEKLY_TICK_DAY;
        return day === 0 ? 7 : day;
    }


    private isAtOrJustAfter(localTime: string, targetHHmm: string): boolean {
        if (localTime === targetHHmm) return true;

        const [h, m] = targetHHmm.split(':').map(Number);
        const targetPlus30 = DateTime.fromObject({ hour: h, minute: m }).plus({ minutes: 30 }).toFormat('HH:mm');
        return localTime === targetPlus30;
    }



    // -----------------------------------------------------------------
    // Idempotency mechanism
    // -----------------------------------------------------------------

    private async acquireIdempotency(key: string, type: IdempotencyKeyType): Promise<boolean> {
        try {
            await this.prisma.schedulerIdempotencyKey.create({
                data: { key, type }
            });
            return true;
        } catch (error: any) {
            if (error.code === 'P2002') return false;
            throw error;
        }
    }

    private async releaseIdempotency(key: string, type: IdempotencyKeyType): Promise<void> {
        try {

            await this.prisma.schedulerIdempotencyKey.deleteMany({
                where: { key, type }
            });
        } catch {
            return;
        }
    }
}