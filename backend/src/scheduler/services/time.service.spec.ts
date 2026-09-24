import { Test, TestingModule } from '@nestjs/testing';
import { TimeService } from './time.service';

describe('TimeService', () => {
    let service: TimeService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TimeService],
        }).compile();

        service = module.get<TimeService>(TimeService);
    });

    describe('localDate', () => {
        it('should correctly map a late UTC time to the next day in SAST (UTC+2)', () => {
            // 22:30 UTC is 00:30 SAST the next day
            const result = service.localDate('2026-09-21T22:30:00Z', 'Africa/Johannesburg');
            expect(result).toBe('2026-09-22');
        });

        it('should correctly map an early UTC time to the same day in SAST', () => {
            // 06:00 UTC is 08:00 SAST same day
            const result = service.localDate('2026-09-21T06:00:00Z', 'Africa/Johannesburg');
            expect(result).toBe('2026-09-21');
        });
    });

    describe('atLocal', () => {
        it('should convert a local date and time to a UTC instant', () => {
            // 08:00 SAST is 06:00 UTC
            const result = service.atLocal('2026-09-21', '08:00', 'Africa/Johannesburg');
            expect(result).toBe('2026-09-21T06:00:00Z');
        });

        it('should throw an error for an invalid time string', () => {
            expect(() => service.atLocal('2026-09-21', '25:00', 'Africa/Johannesburg')).toThrow();
        });
    });

    describe('weekOf', () => {
        it('should return the Monday of the week for a Thursday', () => {
            const result = service.weekOf('2026-09-24');
            expect(result).toBe('2026-09-21'); // Monday
        });

        it('should return the previous Monday for a Sunday', () => {
            const result = service.weekOf('2026-09-20');
            expect(result).toBe('2026-09-14'); // Monday
        });
    });

    describe('workingWindows', () => {
        it('should generate 10 intervals (5 days x 2 blocks) accounting for a 1-hour lunch break', () => {
            const windows = service.workingWindows('2026-09-21', 'Africa/Johannesburg');

            expect(windows).toHaveLength(10);

            // Monday Morning Block: 08:00 to 13:00 SAST (06:00 to 11:00 UTC)
            expect(windows[0]).toEqual({
                start: '2026-09-21T06:00:00Z',
                end: '2026-09-21T11:00:00Z',
            });

            // Monday Afternoon Block: 14:00 to 16:00 SAST (12:00 to 14:00 UTC)
            expect(windows[1]).toEqual({
                start: '2026-09-21T12:00:00Z',
                end: '2026-09-21T14:00:00Z',
            });

            // Friday Afternoon Block (last interval)
            expect(windows[9]).toEqual({
                start: '2026-09-25T12:00:00Z',
                end: '2026-09-25T14:00:00Z',
            });
        });
    });

    describe('isInCoreHours', () => {
        it('should return true for a time exactly at the start of core hours', () => {
            // 06:00 UTC = 08:00 SAST
            expect(service.isInCoreHours('2026-09-21T06:00:00Z', 'Africa/Johannesburg')).toBe(true);
        });

        it('should return true for a time exactly at the end of core hours', () => {
            // 14:00 UTC = 16:00 SAST
            expect(service.isInCoreHours('2026-09-21T14:00:00Z', 'Africa/Johannesburg')).toBe(true);
        });

        it('should return false for a time just outside core hours', () => {
            // 14:01 UTC = 16:01 SAST
            expect(service.isInCoreHours('2026-09-21T14:01:00Z', 'Africa/Johannesburg')).toBe(false);
        });

        it('should return false for weekends even if the time falls within core hours', () => {
            // Sunday 12:00 SAST
            expect(service.isInCoreHours('2026-09-20T10:00:00Z', 'Africa/Johannesburg')).toBe(false);
        });
    });
});