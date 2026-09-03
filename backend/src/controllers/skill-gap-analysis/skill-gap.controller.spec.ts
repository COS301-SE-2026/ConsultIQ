import { Test, TestingModule } from '@nestjs/testing';
import { SkillGapController } from './skill-gap.controller';
import { SkillGapService } from '../../skill-gap-analysis/services/skill-gap.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('SkillGapController', () => {
    let controller: SkillGapController;
    let service: SkillGapService;

    const mockSkillGapService = {
        getPortfolioSkillGapAnalysis: jest.fn(),
        getProjectSkillGapAnalysis: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SkillGapController],
            providers: [
                {
                    provide: SkillGapService,
                    useValue: mockSkillGapService,
                },
            ],
        }).compile();

        controller = module.get<SkillGapController>(SkillGapController);
        service = module.get<SkillGapService>(SkillGapService);
        jest.clearAllMocks();
    });

    describe('getPortfolioAnalysis', () => {
        it('should throw a ForbiddenException if userId is missing from request', async () => {
            const mockReq = { user: {} };

            await expect(controller.getPortfolioAnalysis(mockReq))
                .rejects
                .toThrow(ForbiddenException);

            await expect(controller.getPortfolioAnalysis(mockReq))
                .rejects
                .toThrow('Authentication required.');
        });

        it('should return the portfolio analysis for an authenticated user', async () => {
            const mockReq = { user: { userId: 'user-123' } };
            const mockResponse = {
                summary: { overallCoveragePercent: 80, adequatelyCoveredCount: 5, atRiskCount: 1, criticalCount: 0 },
                skills: [],
                alerts: []
            };

            mockSkillGapService.getPortfolioSkillGapAnalysis.mockResolvedValue(mockResponse);

            const result = await controller.getPortfolioAnalysis(mockReq);

            expect(result).toEqual(mockResponse);
            expect(service.getPortfolioSkillGapAnalysis).toHaveBeenCalledTimes(1);
        });
    });

    describe('getProjectAnalysis', () => {
        const projectId = 'proj-123';

        it('should throw a ForbiddenException if userId is missing from request', async () => {
            const mockReq = { user: null };

            await expect(controller.getProjectAnalysis(projectId, mockReq))
                .rejects
                .toThrow(ForbiddenException);
        });

        it('should return the project analysis for an authenticated user', async () => {
            const mockReq = { user: { userId: 'user-123' } };
            const mockResponse = {
                projectId,
                projectName: 'Alpha Project',
                summary: { overallCoveragePercent: 100, adequatelyCoveredCount: 3, atRiskCount: 0, criticalCount: 0 },
                skills: []
            };

            mockSkillGapService.getProjectSkillGapAnalysis.mockResolvedValue(mockResponse);

            const result = await controller.getProjectAnalysis(projectId, mockReq);

            expect(result).toEqual(mockResponse);
            expect(service.getProjectSkillGapAnalysis).toHaveBeenCalledWith(projectId);
        });

        it('should throw a NotFoundException if the service throws "Project not found"', async () => {
            const mockReq = { user: { userId: 'user-123' } };

            mockSkillGapService.getProjectSkillGapAnalysis.mockRejectedValue(new Error('Project not found'));

            await expect(controller.getProjectAnalysis(projectId, mockReq))
                .rejects
                .toThrow(NotFoundException);

            await expect(controller.getProjectAnalysis(projectId, mockReq))
                .rejects
                .toThrow(`Project with ID ${projectId} not found`);
        });

        it('should re-throw generic errors without wrapping them in NotFoundException', async () => {
            const mockReq = { user: { userId: 'user-123' } };
            const dbError = new Error('Database connection failed');

            mockSkillGapService.getProjectSkillGapAnalysis.mockRejectedValue(dbError);

            await expect(controller.getProjectAnalysis(projectId, mockReq))
                .rejects
                .toThrow('Database connection failed');
        });
    });
});