import { Injectable, BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Interval } from '../dto/scheduler.dto';
import { SCHEDULER_RULES } from './scheduler-rules.constant';

export type Instant = string & { readonly __brand: unique symbol };
export type LocalDate = string & { readonly __brand: unique symbol }; // YYYY-MM-DD

const parseHM = (hm: string): { hour: number; minute: number } => {
    const [hour, minute] = hm.split(':').map(Number);
    return { hour, minute };
};

@Injectable()
export class TimeService {

    // Core hours are parsed once, not on every call
    private readonly coreStart = parseHM(SCHEDULER_RULES.CORE_HOURS_START);
    private readonly coreEnd = parseHM(SCHEDULER_RULES.CORE_HOURS_END);


    private parse(instant: string | Instant, timezone: string): DateTime {
        return DateTime.fromISO(instant as string, { zone: 'utc', setZone: true }).setZone(timezone);
    }

    private toIso(dt: DateTime): string {
        return dt.toUTC().toISO({ suppressMilliseconds: true }) as string;
    }

    /**
     * Local calendar date of an instant in the given timezone.
     * Expects a full instant, not a date-only string.
     * e.g., localDate("2026-09-21T22:30:00Z", "Africa/Johannesburg") -> "2026-09-22"
     */
    localDate(instant: string | Instant, timezone: string): LocalDate {
        const dt = this.parse(instant, timezone);

        if (!dt.isValid) {
            throw new BadRequestException(`Invalid instant or timezone: ${dt.invalidReason}`);
        }

        return dt.toFormat('yyyy-MM-dd') as LocalDate;
    }

    atLocal(date: string | LocalDate, time: string, timezone: string): Instant {

        const dt = DateTime.fromFormat(`${date}T${time}`, "yyyy-MM-dd'T'HH:mm", { zone: timezone });

        if (!dt.isValid) {
            throw new BadRequestException(`Invalid date/time/timezone: ${dt.invalidReason}`);
        }

        return this.toIso(dt) as Instant;
    }

    weekOf(date: string | LocalDate): LocalDate {

        const dt = DateTime.fromISO(date as string, { zone: 'utc' });

        if (!dt.isValid) {
            throw new BadRequestException(`Invalid date: ${dt.invalidReason}`);
        }

        return dt.startOf('week').toFormat('yyyy-MM-dd') as LocalDate;
    }

    workingWindows(weekStart: string | LocalDate, timezone: string): Interval[] {
        const windows: Interval[] = [];
        const startDt = DateTime.fromISO(weekStart as string, { zone: timezone });

        if (!startDt.isValid) {
            throw new BadRequestException(`Invalid weekStart: ${startDt.invalidReason}`);
        }

        if (startDt.weekday !== 1) {
            throw new BadRequestException(`weekStart must be a Monday, got ${startDt.toFormat('yyyy-MM-dd')}`);
        }

        for (let i = 0; i < 5; i++) {
            const day = startDt.plus({ days: i });

            const workStart = day.set({ hour: this.coreStart.hour, minute: this.coreStart.minute, second: 0, millisecond: 0 });
            const workEnd = day.set({ hour: this.coreEnd.hour, minute: this.coreEnd.minute, second: 0, millisecond: 0 });

            // Unpaid lunch after a stretch of continuous work (durations come from SCHEDULER_RULES).
            const lunchStart = workStart.plus({ minutes: SCHEDULER_RULES.LUNCH_AFTER_CONTINUOUS_MINUTES });
            const lunchEnd = lunchStart.plus({ minutes: SCHEDULER_RULES.UNPAID_LUNCH_MINUTES });

            if (lunchEnd < workEnd) {
                // Split into two intervals (morning and afternoon)
                windows.push(
                    { start: this.toIso(workStart), end: this.toIso(lunchStart) },
                    { start: this.toIso(lunchEnd), end: this.toIso(workEnd) }
                );
            } else {
                windows.push({ start: this.toIso(workStart), end: this.toIso(workEnd) });
            }
        }

        return windows;
    }

    isInCoreHours(instant: string | Instant, timezone: string): boolean {
        const dt = this.parse(instant, timezone);

        if (!dt.isValid) return false;

        if (dt.weekday > 5) return false;

        const timeInMinutes = dt.hour * 60 + dt.minute;
        const coreStartInMinutes = this.coreStart.hour * 60 + this.coreStart.minute;
        const coreEndInMinutes = this.coreEnd.hour * 60 + this.coreEnd.minute;

        return timeInMinutes >= coreStartInMinutes && timeInMinutes <= coreEndInMinutes;
    }

    isRangeInCoreHours(start: string | Instant, end: string | Instant, timezone: string): boolean {
        const s = this.parse(start, timezone);
        const e = this.parse(end, timezone);

        if (!s.isValid || !e.isValid) return false;
        if (e.toMillis() < s.toMillis()) return false;
        if (s.toFormat('yyyy-MM-dd') !== e.toFormat('yyyy-MM-dd')) return false;

        return this.isInCoreHours(start, timezone) && this.isInCoreHours(end, timezone);
    }
}