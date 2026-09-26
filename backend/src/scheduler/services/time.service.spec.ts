import { Test, TestingModule } from '@nestjs/testing';
import { TimeService } from './time.service';
import { BadRequestException } from '@nestjs/common';
import { SCHEDULER_RULES } from './scheduler-rules.constant';
import { Instant } from './time.service';

jest.mock('./scheduler-rules.constant', () => ({
    SCHEDULER_RULES: {
        CORE_HOURS_START: '08:00',
        CORE_HOURS_END: '17:00',
        LUNCH_AFTER_CONTINUOUS_MINUTES: 300, // 5 hours
        UNPAID_LUNCH_MINUTES: 60, // 1 hour
    },
}));

describe('TimeService', () => {
    let service: TimeService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TimeService],
        }).compile();

        service = module.get<TimeService>(TimeService);
    });

    describe('localDate', () => {
        it('should correctly derive local date from UTC instant', () => {
            // 10:30 PM UTC is 12:30 AM the NEXT day in SAST (+02:00)
            const date = service.localDate('2026-09-21T22:30:00Z', 'Africa/Johannesburg');
            expect(date).toBe('2026-09-22');
        });

        it('should throw BadRequestException on invalid instant', () => {
            expect(() => service.localDate('not-a-date', 'Africa/Johannesburg')).toThrow(BadRequestException);
        });
    });

    describe('atLocal', () => {
        it('should correctly convert local date and time to UTC instant', () => {
            // 8:00 AM SAST is 6:00 AM UTC
            const instant = service.atLocal('2026-09-21', '08:00', 'Africa/Johannesburg');
            expect(instant).toBe('2026-09-21T06:00:00Z');
        });

        it('should throw BadRequestException on invalid inputs', () => {
            expect(() => service.atLocal('2026-09-21', '25:00', 'Africa/Johannesburg')).toThrow(BadRequestException);
        });
    });

    describe('weekOf', () => {
        it('should return the Monday of the ISO week containing the date', () => {
            // Sept 24, 2026 is a Thursday. The Monday is Sept 21.
            const monday = service.weekOf('2026-09-24');
            expect(monday).toBe('2026-09-21');
        });

        it('should throw BadRequestException on invalid date', () => {
            expect(() => service.weekOf('invalid')).toThrow(BadRequestException);
        });
    });

    describe('workingWindows', () => {
        it('should generate 10 windows (split by lunch) for a valid weekStart', () => {
            // Sept 21, 2026 is a Monday
            const windows = service.workingWindows('2026-09-21', 'Africa/Johannesburg');

            // 5 days * 2 parts (morning and afternoon) = 10 intervals
            expect(windows).toHaveLength(10);

            // Monday Morning: 08:00 SAST -> 06:00 UTC to 13:00 SAST -> 11:00 UTC
            expect(windows[0].start).toBe('2026-09-21T06:00:00Z');
            expect(windows[0].end).toBe('2026-09-21T11:00:00Z');

            // Monday Afternoon: 14:00 SAST -> 12:00 UTC to 17:00 SAST -> 15:00 UTC
            expect(windows[1].start).toBe('2026-09-21T12:00:00Z');
            expect(windows[1].end).toBe('2026-09-21T15:00:00Z');
        });

        it('should NOT split the window if lunch falls at or after workEnd', () => {
            const originalLunch = SCHEDULER_RULES.LUNCH_AFTER_CONTINUOUS_MINUTES;

            // Bypass TypeScript's read-only protection cleanly for testing
            Object.defineProperty(SCHEDULER_RULES, 'LUNCH_AFTER_CONTINUOUS_MINUTES', { value: 600 }); // 10 hours

            const windows = service.workingWindows('2026-09-21', 'Africa/Johannesburg');

            // 5 days * 1 part = 5 intervals
            expect(windows).toHaveLength(5);
            expect(windows[0].start).toBe('2026-09-21T06:00:00Z');
            expect(windows[0].end).toBe('2026-09-21T15:00:00Z'); // Continuous 08:00 to 17:00 SAST

            // Restore the original rule so other tests don't break
            Object.defineProperty(SCHEDULER_RULES, 'LUNCH_AFTER_CONTINUOUS_MINUTES', { value: originalLunch });
        });

        it('should throw BadRequestException if weekStart is not a Monday', () => {
            // Sept 22, 2026 is a Tuesday
            expect(() => service.workingWindows('2026-09-22', 'Africa/Johannesburg')).toThrow(BadRequestException);
        });

        it('should throw BadRequestException on invalid weekStart date', () => {
            expect(() => service.workingWindows('invalid', 'Africa/Johannesburg')).toThrow(BadRequestException);
        });
    });

    describe('isInCoreHours', () => {
        it('should return true for an instant inside core hours on a weekday', () => {
            // 10:00 AM SAST on a Monday
            expect(service.isInCoreHours('2026-09-21T08:00:00Z', 'Africa/Johannesburg')).toBe(true);
        });

        it('should return false for an instant outside core hours', () => {
            // 6:00 AM SAST on a Monday
            expect(service.isInCoreHours('2026-09-21T04:00:00Z', 'Africa/Johannesburg')).toBe(false);
        });

        it('should return false for an instant on a weekend', () => {
            // 10:00 AM SAST on a Saturday (Sept 26)
            expect(service.isInCoreHours('2026-09-26T08:00:00Z', 'Africa/Johannesburg')).toBe(false);
        });

        it('should return false for an invalid instant', () => {
            expect(service.isInCoreHours('invalid', 'Africa/Johannesburg')).toBe(false);
        });
    });

    describe('isRangeInCoreHours', () => {
        it('should return true if entire range is within core hours on the same day', () => {
            // 08:00 to 17:00 SAST on a Monday
            const start = '2026-09-21T06:00:00Z';
            const end = '2026-09-21T15:00:00Z';
            expect(service.isRangeInCoreHours(start, end, 'Africa/Johannesburg')).toBe(true);
        });

        it.each([
            ['start is invalid', 'invalid', '2026-09-21T15:00:00Z'],
            ['end is invalid', '2026-09-21T06:00:00Z', 'invalid'],
            ['end comes before start', '2026-09-21T10:00:00Z', '2026-09-21T08:00:00Z'],
            ['the range spans across different calendar days', '2026-09-25T14:00:00Z', '2026-09-28T07:00:00Z'],
            ['the range spills outside of core hours', '2026-09-21T14:00:00Z', '2026-09-21T16:00:00Z']
        ])('should return false if %s', (_, start, end) => {
            expect(service.isRangeInCoreHours(start, end, 'Africa/Johannesburg')).toBe(false);
        });
    });

    describe('restOfDayWindow', () => {
        it('calculates the window from the given instant to the end of the current week (Sunday midnight)', () => {
            const instant = '2026-09-23T12:00:00Z' as Instant;
            const timezone = 'Africa/Johannesburg';

            const result = service.restOfDayWindow(instant, timezone);

            expect(result.start).toBe('2026-09-23T12:00:00Z');
            expect(result.end).toBe('2026-09-27T22:00:00Z');
        });

        it('handles weekend rollovers correctly (Sunday morning to Sunday midnight)', () => {
            const instant = '2026-09-27T08:00:00Z' as Instant;
            const timezone = 'Africa/Johannesburg';

            const result = service.restOfDayWindow(instant, timezone);
            expect(result.start).toBe('2026-09-27T08:00:00Z');
            expect(result.end).toBe('2026-09-27T22:00:00Z');
        });

        it('maintains strict timezone boundaries (UTC)', () => {
            const instant = '2026-09-23T12:00:00Z' as Instant;
            const timezone = 'UTC';

            const result = service.restOfDayWindow(instant, timezone);

            expect(result.start).toBe('2026-09-23T12:00:00Z');
            expect(result.end).toBe('2026-09-28T00:00:00Z');
        });
    });

    describe('localDateToInstant', () => {
        it('calls atLocal with 00:00 to generate a midnight instant', () => {
            const atLocalSpy = jest.spyOn(service, 'atLocal');
            const date = '2026-09-21';
            const timezone = 'Africa/Johannesburg';

            service.localDateToInstant(date, timezone);

            expect(atLocalSpy).toHaveBeenCalledWith(date, '00:00', timezone);
        });
        it('returns the generated Instant successfully', () => {
            const result = service.localDateToInstant('2026-09-21', 'UTC');
            expect(result).toBe('2026-09-21T00:00:00Z');
        });
    });
});