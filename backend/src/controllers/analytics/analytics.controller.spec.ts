import { Test, TestingModule } from "@nestjs/testing";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "../../analytics/services/analytics.service";

const mockAnalyticsService = {
    getSkillDistribution: jest.fn(),
    getPlacementYTD: jest.fn(),
};

describe('AnalyticsController', () =>{

    let controller: AnalyticsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AnalyticsController],
            providers: [
                {
                    provide: AnalyticsService,
                    useValue: mockAnalyticsService,
                },
            ]
        }).compile();

        controller = module.get<AnalyticsController>(AnalyticsController);

        jest.clearAllMocks();
    });

    describe('getSkillDistribution', () => {
        it('returns exactly what the service returns', async () => {
            const expected = [
                { category: 'Cloud', consultantCount: 5, percentageOfPool: 25 },
            ];
            mockAnalyticsService.getSkillDistribution.mockReturnValue(expected);

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

    describe('getPlacementsYTD', () => {
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
});