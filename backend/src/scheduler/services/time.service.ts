import { Injectable, BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Interval } from '../dto/scheduler.dto';
import { SCHEDULER_RULES } from './scheduler-rules.constant';

export type Instant = string & { readonly __brand: unique symbol };
export type LocalDate = string & { readonly __brand: unique symbol }; // YYYY-MM-DD

@Injectable()
export class TimeService {

    /**
     * e.g., localDate("2026-09-21T22:30:00Z", "Africa/Johannesburg") -> "2026-09-22"
     */
    localDate(instant: string | Instant, timezone: string): LocalDate {
        const dt = DateTime.fromISO(instant as string, { setZone: true }).setZone(timezone);

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

        return dt.toUTC().toISO({ suppressMilliseconds: true }) as Instant;
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

        const [coreStartHour, coreStartMinute] = SCHEDULER_RULES.CORE_HOURS_START.split(':').map(Number);
        const [coreEndHour, coreEndMinute] = SCHEDULER_RULES.CORE_HOURS_END.split(':').map(Number);

        for (let i = 0; i < 5; i++) {
            const day = startDt.plus({ days: i });

            const workStart = day.set({ hour: coreStartHour, minute: coreStartMinute, second: 0, millisecond: 0 });
            const workEnd = day.set({ hour: coreEndHour, minute: coreEndMinute, second: 0, millisecond: 0 });

            // Calculate lunch break: 1 hour unpaid after 5 hours continuous
            const lunchStart = workStart.plus({ hours: 5 });
            const lunchEnd = lunchStart.plus({ hours: 1 });

            if (lunchEnd < workEnd) {
                // Split into two intervals (morning and afternoon)
                windows.push(
                    {
                        start: workStart.toUTC().toISO({ suppressMilliseconds: true }) as string,
                        end: lunchStart.toUTC().toISO({ suppressMilliseconds: true }) as string,
                    },
                    {
                        start: lunchEnd.toUTC().toISO({ suppressMilliseconds: true }) as string,
                        end: workEnd.toUTC().toISO({ suppressMilliseconds: true }) as string,
                    }
                );
            } else {

                windows.push({
                    start: workStart.toUTC().toISO({ suppressMilliseconds: true }) as string,
                    end: workEnd.toUTC().toISO({ suppressMilliseconds: true }) as string,
                });
            }
        }

        return windows;
    }

    isInCoreHours(instant: string | Instant, timezone: string): boolean {
        const dt = DateTime.fromISO(instant as string, { setZone: true }).setZone(timezone);

        if (!dt.isValid) return false;

        if (dt.weekday > 5) return false;

        const [startHour, startMinute] = SCHEDULER_RULES.CORE_HOURS_START.split(':').map(Number);
        const [endHour, endMinute] = SCHEDULER_RULES.CORE_HOURS_END.split(':').map(Number);

        const timeInMinutes = dt.hour * 60 + dt.minute;
        const coreStartInMinutes = startHour * 60 + startMinute;
        const coreEndInMinutes = endHour * 60 + endMinute;

        return timeInMinutes >= coreStartInMinutes && timeInMinutes <= coreEndInMinutes;
    }
}