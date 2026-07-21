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

    describe('updateScoringConfig', () => {
        it('should update the scoring config and return the result', async () => {
            const dto = {
                weights: { skillMatch: 0.6, availability: 0.2, location: 0.2 },
            };
            const req = { user: { userId: 'user-123' } };
        
            mockScoringService.updateScoringConfig.mockResolvedValue({
                message: 'Scoring config updated successfully',
            });
        
            const result = await controller.updateScoringConfig(dto as any, req);
        
            expect(result).toEqual({ message: 'Scoring config updated successfully' });
            expect(mockScoringService.updateScoringConfig).toHaveBeenCalledWith(dto, 'user-123');
        });

        it('should call the service with undefined userId when req.user is missing', async () => {
            const dto = { weights: {} };
            const req = {};
    
            mockScoringService.updateScoringConfig.mockResolvedValue({ message: 'ok' });
            await controller.updateScoringConfig(dto as any, req as any);
            expect(mockScoringService.updateScoringConfig).toHaveBeenCalledWith(dto, undefined);
        });

        it('should propagate errors from the service', async () => {
            const req = { user: { userId: 'user-123' } };
            mockScoringService.updateScoringConfig.mockRejectedValue(new Error('Service error'));
        
            await expect(controller.updateScoringConfig({} as any, req)).rejects.toThrow('Service error');
        });

        
    });
});