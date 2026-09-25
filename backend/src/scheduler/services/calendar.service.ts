import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService, CommitResult } from './week.service';
import { TimeService, LocalDate } from './time.service';
import { CalendarEntryDto, Change, ReasonCode, Interval, ValidateContext } from '../dto/scheduler.dto';

@Injectable()
export class CalendarService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly weekService: WeekService,
        private readonly timeService: TimeService,
    ) { }

    // -----------------------------------------------------------------
    // POST /scheduler/calendar-entries, PATCH /scheduler/calendar-entries/:id
    // -----------------------------------------------------------------

    public async upsert(
        consultantId: string,
        weekStart: LocalDate,
        entry: CalendarEntryDto,
    ): Promise<CommitResult> {

        if (entry.origin === 'public-holiday') {
            return this.rejection(
                consultantId,
                weekStart,
                'HOLIDAY_ENTRY_IMMUTABLE',
                'Public holidays cannot be edited through calendar entries.'
            );
        }

        const week = await this.weekService.getWeek(consultantId, weekStart);


        const resolvedEntry = this.resolveOverrideTags(entry, week.timezone);
        const window = this.dayWindow(resolvedEntry.start, week.timezone);

        const change: Change = {
            type: 'calendar_upsert',
            entry: resolvedEntry,
            origin: 'user',
            window,
        };
        const expectedVersion = (entry as any).expectedVersion as number | undefined;

        const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };

        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    // -----------------------------------------------------------------
    // DELETE /scheduler/calendar-entries/:id
    // -----------------------------------------------------------------

    public async remove(entryId: string, expectedVersion?: number): Promise<CommitResult> {

        const dbEntry = await this.prisma.schedulerCalendarEntry.findUnique({
            where: { id: entryId },
            include: { week: true },
        });

        if (!dbEntry) {
            throw new NotFoundException(`Calendar entry ${entryId} not found`);
        }

        const consultantId = dbEntry.week.consultantId;
        const weekStart = dbEntry.week.weekStart.toISOString().split('T')[0] as LocalDate;

        if ((dbEntry.origin as string) === 'public-holiday') {
            return this.rejection(
                consultantId,
                weekStart,
                'HOLIDAY_ENTRY_IMMUTABLE',
                'Public holidays cannot be removed through calendar entries.'
            );
        }

        const week = await this.weekService.getWeek(consultantId, weekStart);

        const window = this.dayWindow(dbEntry.start.toISOString(), week.timezone);

        const change: Change = {
            type: 'calendar_remove',
            entryId,
            origin: 'user',
            window,
        };

        const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };

        return this.weekService.commit(week, change, ctx, expectedVersion);
    }


    private resolveOverrideTags(entry: CalendarEntryDto, timezone: string): CalendarEntryDto {
        const isOutOfHours = !this.timeService.isRangeInCoreHours(entry.start, entry.end, timezone);
        if (!isOutOfHours) return entry;
        if (!entry.confirmedOverride) return entry;

        const day = DateTime.fromISO(entry.start as string, { zone: 'utc' }).setZone(timezone);
        const isWeekend = day.weekday > 5;

        const tags = new Set(entry.tags ?? []);
        tags.add(isWeekend ? 'weekend' : 'extended-hours');

        return { ...entry, tags: Array.from(tags) };
    }

    private dayWindow(instant: string, timezone: string): Interval {
        const day = this.timeService.localDate(instant, timezone);
        const nextDay = DateTime.fromISO(day as string, { zone: 'utc' }).plus({ days: 1 }).toFormat('yyyy-MM-dd') as LocalDate;

        return {
            start: this.timeService.localDateToInstant(day, timezone),
            end: this.timeService.localDateToInstant(nextDay, timezone),
        };
    }

    private async rejection(
        consultantId: string,
        weekStart: LocalDate,
        code: ReasonCode,
        message: string,
    ): Promise<CommitResult> {
        const current = await this.weekService.getWeek(consultantId, weekStart);
        return {
            ok: false,
            value: current,
            violations: [{ level: 'violation', code, message }],
            warnings: [],
            infos: [],
        };
    }
}