import { Test, TestingModule } from '@nestjs/testing';
import { ScoringController } from './scoring.controller';
import { ScoringService } from '../../scoring/services/scoring-config.service';

const mockScoringService = {
  getScoringConfig: jest.fn(),
  updateScoringConfig: jest.fn(),
  updateProjectScoringOverride: jest.fn(),
  deleteProjectScoringOverride: jest.fn(),
  getProjectScoringOverride: jest.fn(),
};

describe('ScoringController', () => {
    let controller: ScoringController;

    beforeEach (async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ScoringController],
            providers: [
                { provide: ScoringService, useValue: mockScoringService },
            ],
        }).compile();

        controller = module.get<ScoringController>(ScoringController)
        jest.clearAllMocks();
    });

    describe('getScoringConfig', () => {
        it('should return the current scoring config', async () => {
            const mockConfig ={
                weights: { skillMatch: 50, availability: 30, location: 20 },
            };

            mockScoringService.getScoringConfig.mockResolvedValue(mockConfig);

            const result = await controller.getScoringConfig();

            expect(result).toEqual(mockConfig);
            expect(mockScoringService.getScoringConfig).toHaveBeenCalled();
        });
        it('should propagate errors from the services', async () => {
            mockScoringService.getScoringConfig.mockRejectedValue(new Error('Service error'));
            await expect(controller.getScoringConfig()).rejects.toThrow('Service error');
        });        
    });
    


})