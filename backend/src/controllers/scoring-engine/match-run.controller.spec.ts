import { Test, TestingModule } from '@nestjs/testing';
import { MatchRunService } from '../../scoring/services/match-run.service';
import { ConsultantMatchResult } from '../../scoring/services/interfaces/match-result.interface';
import { MatchRunController } from './match-run.controller';


describe('MatchRunController', () => {
    let controller: MatchRunController;

    let mockMatchRunService: any;

    beforeEach(async () => {


        mockMatchRunService = {
            executeMatchRun: jest.fn(),
            enqueueMatchRun: jest.fn(),
            getMatchRun: jest.fn(),
            getMatchRunStatus: jest.fn(),
            getMatchRunStats: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MatchRunController],
            providers: [
                { provide: MatchRunService, useValue: mockMatchRunService },
            ],
        }).compile();

        controller = module.get<MatchRunController>(MatchRunController);
    })


    afterEach(() => {
        jest.clearAllMocks();
    })

    describe('executeMatchRun', () => {

        it('successfully ran match run', async () => {

            const projectId = 'project-01';
            const userId = 'user-01';

            const mockRequest = {
                user: { userId: userId },
            };

            const mockResult = { runId: 'run-01', status: 'IN_PROGRESS' as const };
            mockMatchRunService.enqueueMatchRun.mockResolvedValue(mockResult);
            const result = await controller.executeMatchRun(projectId, mockRequest);

            expect(mockMatchRunService.enqueueMatchRun).toHaveBeenCalledWith(projectId, userId);
            expect(mockMatchRunService.enqueueMatchRun).toHaveBeenCalledTimes(1);

            expect(result).toEqual(mockResult);
        })


    })

    describe('getMatchRunStatus', () => {
        it('retrieves match run status using the route project id', async () => {
            const status = { runId: 'run-01', status: 'COMPLETED', progress: 100 };
            mockMatchRunService.getMatchRunStatus.mockResolvedValue(status);

            const result = await controller.getMatchRunStatus('project-01', 'run-01');

            expect(mockMatchRunService.getMatchRunStatus).toHaveBeenCalledWith('project-01', 'run-01');
            expect(result).toEqual(status);
        });
    });


    describe('getMatchRun', () => {
        it('successefully retrieves match run results', async () => {
            const projectId = 'project-01';
            const runId = 'run-01';;

            const mockResult: ConsultantMatchResult[] = [
                { consultantId: 'consultant-01', consultantName: 'Benji', consultantEmail: 'Benji@gmail.com', finalScore: 90, rank: 1, isPlaced: false, factorBreakdown: [] },
            ];
            mockMatchRunService.getMatchRun.mockResolvedValue(mockResult);
            const result = await controller.getMatchRun(projectId, runId);

            expect(mockMatchRunService.getMatchRun).toHaveBeenCalledWith(projectId, runId);
            expect(mockMatchRunService.getMatchRun).toHaveBeenCalledTimes(1);

            expect(result).toEqual(mockResult);
        });
    })

    describe('getMatchRunStats', () => {
        it('successefully retrieves match run stats', async () => {
            const projectId = 'project-01';
            const runId = 'run-01';;

            const mockStats = {
                totalEvaluated: 12,
                totalExcluded: 2,
                totalMatched: 10,
                totalPlaced: 3
            };

            mockMatchRunService.getMatchRunStats.mockResolvedValue(mockStats);
            const result = await controller.getMatchRunStats(projectId, runId);

            expect(mockMatchRunService.getMatchRunStats).toHaveBeenCalledWith(projectId, runId);
            expect(mockMatchRunService.getMatchRunStats).toHaveBeenCalledTimes(1);

            expect(result).toEqual(mockStats);
        });
    })



})