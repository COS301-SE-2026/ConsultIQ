import { Test, TestingModule } from '@nestjs/testing';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { GeographicFitScorer } from './geographic-fit.scorer';
import { LocationService } from '../../../location/services/location.service';
import { Logger } from '@nestjs/common';

function consultant(city: string, province: string, latitude?: number, longitude?: number): RawConsultantDto {
    return {
        consultantId: 'consultant-01',
        skills: [],
        costToCompany: 0,
        city,
        province,
        latitude,
        longitude
    } as RawConsultantDto;
}

function project(city: string, province: string, isRemote = false, latitude?: number, longitude?: number): RawProjectDto {
    return {
        projectId: 'project-01',
        requiredSkills: [],
        billingBudgetPerHour: 0,
        city,
        province,
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        requiredAllocationPercentage: 50,
        isRemote,
        latitude,
        longitude
    } as RawProjectDto;
}

describe('GeographicFitScorer', () => {
    let scorer: GeographicFitScorer;
    let locationService: jest.Mocked<LocationService>;

    beforeEach(async () => {
        const mockLocationService = {
            calculateTravelMetrics: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GeographicFitScorer,
                { provide: LocationService, useValue: mockLocationService }
            ],
        }).compile();

        scorer = module.get<GeographicFitScorer>(GeographicFitScorer);
        locationService = module.get(LocationService);

        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // describe('Remote Short-Circuit', () => {
    //     it('scores 1.0 immediately if the project is remote', async () => {
    //         const cons = consultant('Cape Town', 'Western Cape');
    //         const proj = project('Johannesburg', 'Gauteng', true);

    //         const result = await scorer.score(cons, proj);

    //         expect(result.score).toBe(1.0);
    //         expect(result.dataSource).toBe('remote');
    //         expect(result.details).toBe('Project is fully remote. Geographic fit is bypassed.');
    //         expect(locationService.calculateTravelMetrics).not.toHaveBeenCalled();
    //     });
    // });

    describe('API Distance/Duration Scoring', () => {
        it('scores using continuous decay based on travel duration', async () => {
            const cons = consultant('Pretoria', 'Gauteng', -25.7479, 28.2293);
            const proj = project('Midrand', 'Gauteng', false, -25.9988, 28.1283);

            locationService.calculateTravelMetrics.mockResolvedValueOnce({
                distanceMeters: 30000,
                distanceText: '30 km',
                durationSeconds: 2700,
                durationText: '45 mins',
            });

            const result = await scorer.score(cons, proj);

            expect(result.score).toBeCloseTo(0.3678, 3);
            expect(result.dataSource).toBe('api-duration');
            expect(result.details).toContain('Travel time: 45 mins (30.0 km).');
        });

        it('falls back to distance decay if duration is 0', async () => {
            const cons = consultant('Pretoria', 'Gauteng', -25.7479, 28.2293);
            const proj = project('Midrand', 'Gauteng', false, -25.9988, 28.1283);

            locationService.calculateTravelMetrics.mockResolvedValueOnce({
                distanceMeters: 40000,
                distanceText: '40 km',
                durationSeconds: 0,
                durationText: '',
            });

            const result = await scorer.score(cons, proj);

            expect(result.score).toBeCloseTo(0.3678, 3);
            expect(result.dataSource).toBe('api-distance');
            expect(result.details).toContain('Distance: 40.0 km.');
        });

    });

    describe('Fallback String Matching (Missing Coords or API Failure)', () => {
        it('scores 0.8 for the exact same city when API is skipped', async () => {
            const cons = consultant('Johannesburg', 'Gauteng');
            const proj = project('Johannesburg', 'Gauteng');

            const result = await scorer.score(cons, proj);

            expect(result.score).toBe(0.8);
            expect(result.dataSource).toBe('fallback');
            expect(result.details).toBe('Located in the exact project city (Johannesburg, Gauteng)');
            expect(locationService.calculateTravelMetrics).not.toHaveBeenCalled();
        });

        it('scores 0.5 for the same province but different city', async () => {
            const cons = consultant('Pretoria', 'Gauteng');
            const proj = project('Johannesburg', 'Gauteng');

            const result = await scorer.score(cons, proj);

            expect(result.score).toBe(0.5);
            expect(result.dataSource).toBe('fallback');
            expect(result.details).toBe('Located in the same province (Gauteng), but a different city');
        });

        it('scores 0.1 for a different province', async () => {
            const cons = consultant('Cape Town', 'Western Cape');
            const proj = project('Johannesburg', 'Gauteng');

            const result = await scorer.score(cons, proj);

            expect(result.score).toBe(0.1);
            expect(result.dataSource).toBe('fallback');
            expect(result.details).toBe('Located in (Western Cape). Project requires Gauteng');
        });

        it('falls back to string matching if API returns null/fails', async () => {
            const cons = consultant('Pretoria', 'Gauteng', -25.7479, 28.2293);
            const proj = project('Johannesburg', 'Gauteng', false, -26.2041, 28.0473);


            locationService.calculateTravelMetrics.mockResolvedValueOnce(null);

            const result = await scorer.score(cons, proj);

            expect(result.score).toBe(0.5);
            expect(result.dataSource).toBe('fallback');
            expect(locationService.calculateTravelMetrics).toHaveBeenCalledTimes(1);
        });
    });

    describe('Caching and Concurrency (Stampede Protection)', () => {
        it('returns cached metrics on subsequent calls without hitting the API again', async () => {
            const cons = consultant('Pretoria', 'Gauteng', -25.74, 28.22);
            const proj = project('Midrand', 'Gauteng', false, -25.99, 28.12);

            locationService.calculateTravelMetrics.mockResolvedValueOnce({
                distanceMeters: 30000,
                distanceText: '30 km',
                durationSeconds: 2700,
                durationText: '45 mins',
            });

            await scorer.score(cons, proj);

            const secondResult = await scorer.score(cons, proj);

            expect(secondResult.dataSource).toBe('api-duration');
            expect(locationService.calculateTravelMetrics).toHaveBeenCalledTimes(1);
        });

        it('batches concurrent requests for the same coordinates into a single API call', async () => {
            const cons = consultant('Pretoria', 'Gauteng', -25.74, 28.22);
            const proj = project('Midrand', 'Gauteng', false, -25.99, 28.12);

            locationService.calculateTravelMetrics.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return {
                    distanceMeters: 30000,
                    distanceText: '30 km',
                    durationSeconds: 2700,
                    durationText: '45 mins',
                };
            });

            const results = await Promise.all([
                scorer.score(cons, proj),
                scorer.score(cons, proj),
                scorer.score(cons, proj)
            ]);

            expect(results[0].dataSource).toBe('api-duration');
            expect(results[1].dataSource).toBe('api-duration');
            expect(results[2].dataSource).toBe('api-duration');

            expect(locationService.calculateTravelMetrics).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cache Eviction and Error Handling (Edge Cases)', () => {

        it('deletes the cache entry if it has expired', async () => {
            jest.useFakeTimers();
            const cons = consultant('Pretoria', 'Gauteng', -25.74, 28.22);
            const proj = project('Midrand', 'Gauteng', false, -25.99, 28.12);

            locationService.calculateTravelMetrics.mockResolvedValueOnce({
                distanceMeters: 30000,
                distanceText: '30 km',
                durationSeconds: 2700,
                durationText: '45 mins',
            });

            await scorer.score(cons, proj);
            expect(locationService.calculateTravelMetrics).toHaveBeenCalledTimes(1);
            jest.advanceTimersByTime(25 * 60 * 60 * 1000);


            locationService.calculateTravelMetrics.mockResolvedValueOnce({
                distanceMeters: 30000,
                distanceText: '30 km',
                durationSeconds: 2700,
                durationText: '45 mins',
            });

            await scorer.score(cons, proj);

            expect(locationService.calculateTravelMetrics).toHaveBeenCalledTimes(2);
            jest.useRealTimers();
        });

        it('handles API rejection (catch block) and falls back to string match', async () => {
            const cons = consultant('Pretoria', 'Gauteng', -25.74, 28.22);
            const proj = project('Midrand', 'Gauteng', false, -25.99, 28.12);

            locationService.calculateTravelMetrics.mockRejectedValueOnce(new Error('Google Maps API Down'));

            const result = await scorer.score(cons, proj);

            expect(result.score).toBe(0.5);
            expect(result.dataSource).toBe('fallback');

            expect(Logger.prototype.warn).toHaveBeenCalledWith(
                expect.stringContaining('API failed for'),
                expect.any(Error)
            );
        });

        it('evicts the oldest cache entry when MAX_CACHE_SIZE is exceeded', async () => {
            const cons = consultant('Pretoria', 'Gauteng', -25.74, 28.22);
            const proj = project('Midrand', 'Gauteng', false, -25.99, 28.12);

            const cache = (scorer as any).distanceCache;

            for (let i = 0; i < 5000; i++) {
                cache.set(`dummy_key_${i}`, { metrics: null, expiresAt: Date.now() + 100000 });
            }

            expect(cache.size).toBe(5000);

            locationService.calculateTravelMetrics.mockResolvedValueOnce({
                distanceMeters: 30000,
                distanceText: '30 km',
                durationSeconds: 2700,
                durationText: '45 mins',
            });

            await scorer.score(cons, proj);
            expect(cache.size).toBe(5000);
            expect(cache.has('dummy_key_0')).toBe(false);
        });
    });
});