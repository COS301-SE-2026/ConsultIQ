import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from '../../analytics/services/analytics.service';

describe('AnalyticsController', () => {
    let controller: AnalyticsController;
    let analyticsService: jest.Mocked<AnalyticsService>;

    const mockAnalyticsService = {
        getSkillDistribution: jest.fn(),
        getPlacementYTD: jest.fn(),
        getOverallUtilisation: jest.fn(),
        getUtilisationBySkillCategory: jest.fn(),
        getOverallBenchCount: jest.fn(),
        getBenchBySkillCategory: jest.fn(),
        getPlacementsBySkillCategory: jest.fn(),
        getCvParsingStats: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AnalyticsController],
            providers: [{ provide: AnalyticsService, useValue: mockAnalyticsService }],
        }).compile();

        controller = module.get<AnalyticsController>(AnalyticsController);
        analyticsService = module.get(AnalyticsService);
        jest.clearAllMocks();
    });

    afterEach(() => jest.clearAllMocks());

    //------------------------------SKILL DISTRIBUTION ---------------------------------

    describe('getSkillDistribution', () => {
        it('returns exactly what the service returns', async () => {
            const expected = [
                { category: 'Cloud', consultantCount: 5, percentageOfPool: 25 },
            ];
            mockAnalyticsService.getSkillDistribution.mockResolvedValue(expected);

            const result = await controller.getSkillDistribution();
            expect(result).toEqual(expected);
        });

        it('calls the service exactly once with no arguments', async () => {
            mockAnalyticsService.getSkillDistribution.mockResolvedValue([]);

            await controller.getSkillDistribution();

            expect(mockAnalyticsService.getSkillDistribution).toHaveBeenCalledTimes(1);
            expect(mockAnalyticsService.getSkillDistribution).toHaveBeenCalledWith();
        });
    });

    //------------------------------PLACEMENTS YTD ---------------------------------

    describe('getPlacementYTD', () => {
        it('returns exactly what the service returns', async () => {
            const expected = { count: 7 };
            mockAnalyticsService.getPlacementYTD.mockResolvedValue(expected);

            const result = await controller.getPlacementYTD();
            expect(result).toEqual(expected);
        });

        it('calls the service exactly once with no arguments', async () => {
            mockAnalyticsService.getPlacementYTD.mockResolvedValue({ count: 0 });

            await controller.getPlacementYTD();

            expect(mockAnalyticsService.getPlacementYTD).toHaveBeenCalledTimes(1);
            expect(mockAnalyticsService.getPlacementYTD).toHaveBeenCalledWith();
        });
    });

    //------------------------------OVERALL UTILISATION---------------------------------

    describe('getOverallUtilisation', () => {
        it('should call analyticsService.getOverallUtilisation and return the result', async () => {
        const expected = { totalConsultants: 10, utilisedConsultants: 3, utilisationPercent: 30.0 };
        analyticsService.getOverallUtilisation.mockResolvedValue(expected);

        const result = await controller.getOverallUtilisation();

        expect(analyticsService.getOverallUtilisation).toHaveBeenCalledTimes(1);
        expect(result).toEqual(expected);
        });

        it('should propagate errors from analyticsService.getOverallUtilisation', async () => {
        analyticsService.getOverallUtilisation.mockRejectedValue(new Error('Database error'));

        await expect(controller.getOverallUtilisation()).rejects.toThrow('Database error');
        });
    });

    //------------------------------UTILISATION BY SKILL CATEGORY---------------------------------

    describe('getUtilisationBySkillCategory', () => {
        it('should call analyticsService.getUtilisationBySkillCategory and return the result', async () => {
        const expected = [
            { category: 'Cloud & DevOps', totalConsultants: 5, utilisedConsultants: 2, utilisationPercent: 40.0 },
        ];
        analyticsService.getUtilisationBySkillCategory.mockResolvedValue(expected);

        const result = await controller.getUtilisationBySkillCategory();

        expect(analyticsService.getUtilisationBySkillCategory).toHaveBeenCalledTimes(1);
        expect(result).toEqual(expected);
        });

        it('should propagate errors from analyticsService.getUtilisationBySkillCategory', async () => {
        analyticsService.getUtilisationBySkillCategory.mockRejectedValue(new Error('Database error'));

        await expect(controller.getUtilisationBySkillCategory()).rejects.toThrow('Database error');
        });
    });

    //------------------------------OVERALL BENCH COUNT---------------------------------

    describe('getOverallBenchCount', () => {
        it('should call analyticsService.getOverallBenchCount and return the result', async () => {
        const expected = { count: 7 };
        analyticsService.getOverallBenchCount.mockResolvedValue(expected);

        const result = await controller.getOverallBenchCount();

        expect(analyticsService.getOverallBenchCount).toHaveBeenCalledTimes(1);
        expect(result).toEqual(expected);
        });

        it('should propagate errors from analyticsService.getOverallBenchCount', async () => {
        analyticsService.getOverallBenchCount.mockRejectedValue(new Error('Database error'));

        await expect(controller.getOverallBenchCount()).rejects.toThrow('Database error');
        });
    });

    //------------------------------BENCH BY SKILL CATEGORY---------------------------------

    describe('getBenchBySkillCategory', () => {
        it('should call analyticsService.getBenchBySkillCategory and return the result', async () => {
        const expected = [{ category: 'Databases', benchCount: 1 }];
        analyticsService.getBenchBySkillCategory.mockResolvedValue(expected);

        const result = await controller.getBenchBySkillCategory();

        expect(analyticsService.getBenchBySkillCategory).toHaveBeenCalledTimes(1);
        expect(result).toEqual(expected);
        });

        it('should propagate errors from analyticsService.getBenchBySkillCategory', async () => {
        analyticsService.getBenchBySkillCategory.mockRejectedValue(new Error('Database error'));

        await expect(controller.getBenchBySkillCategory()).rejects.toThrow('Database error');
        });
    });

    //------------------------------PLACEMENTS BY SKILL CATEGORY---------------------------------

    describe('getPlacementsBySkillCategory', () => {
        it('should call analyticsService.getPlacementsBySkillCategory and return the result', async () => {
        const expected = [{ category: 'Backend Development', placementCount: 4 }];
        analyticsService.getPlacementsBySkillCategory.mockResolvedValue(expected);

        const result = await controller.getPlacementsBySkillCategory();

        expect(analyticsService.getPlacementsBySkillCategory).toHaveBeenCalledTimes(1);
        expect(result).toEqual(expected);
        });

        it('should propagate errors from analyticsService.getPlacementsBySkillCategory', async () => {
        analyticsService.getPlacementsBySkillCategory.mockRejectedValue(new Error('Database error'));

        await expect(controller.getPlacementsBySkillCategory()).rejects.toThrow('Database error');
        });
    });

    //------------------------------CV PARSING STATS---------------------------------

    describe('getCvParsingStats', () => {
        it('should call analyticsService.getCvParsingStats and return the result', async () => {
        const expected = {
            totalProcessed: 12,
            ruleBasedCount: 5,
            aiAssistedCount: 7,
            successCount: 10,
            failedCount: 2,
            averageConfidence: 0.87,
        };
        analyticsService.getCvParsingStats.mockResolvedValue(expected);

        const result = await controller.getCvParsingStats();

        expect(analyticsService.getCvParsingStats).toHaveBeenCalledTimes(1);
        expect(result).toEqual(expected);
        });

        it('should propagate errors from analyticsService.getCvParsingStats', async () => {
        analyticsService.getCvParsingStats.mockRejectedValue(new Error('Database error'));

        await expect(controller.getCvParsingStats()).rejects.toThrow('Database error');
        });
    });
});