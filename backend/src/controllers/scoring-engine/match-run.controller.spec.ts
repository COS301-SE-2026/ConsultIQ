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
            getMatchRun: jest.fn(),
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

            const mockResult: ConsultantMatchResult[] = [
                { consultantId: 'consultant-01', consultantName: 'Benji', consultantEmail: 'Benji@gmail.com', finalScore: 90, rank: 1, factorBreakdown: [] },
            ];
            mockMatchRunService.executeMatchRun.mockResolvedValue(mockResult);
            const result = await controller.executeMatchRun(projectId, mockRequest);

            expect(mockMatchRunService.executeMatchRun).toHaveBeenCalledWith(projectId, userId);
            expect(mockMatchRunService.executeMatchRun).toHaveBeenCalledTimes(1);

            expect(result).toEqual(mockResult);
        })


    })


    describe('getMatchRun', () => {
        it('successefully retrieves match run results', async () => {
            const projectId = 'project-01';
            const runId = 'run-01';;

            const mockResult: ConsultantMatchResult[] = [
                { consultantId: 'consultant-01', consultantName: 'Benji', consultantEmail: 'Benji@gmail.com', finalScore: 90, rank: 1, factorBreakdown: [] },
            ];
            mockMatchRunService.getMatchRun.mockResolvedValue(mockResult);
            const result = await controller.getMatchRun(projectId, runId);

            expect(mockMatchRunService.getMatchRun).toHaveBeenCalledWith(projectId, runId);
            expect(mockMatchRunService.getMatchRun).toHaveBeenCalledTimes(1);

            expect(result).toEqual(mockResult);
        });
    })



})