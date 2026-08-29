import { Test, TestingModule } from '@nestjs/testing';
import { MatchRunProcessor } from './match-run.processor';
import { MatchRunService } from '../services/match-run.service';


describe('MatchRunProcessor', () => {
    let processor: MatchRunProcessor;
    let mockMatchRunService: any;
    let mockJob: any;

    beforeEach(async () => {

        mockMatchRunService = {
            executeMatchRun: jest.fn(),
            updateMatchRunProgress: jest.fn(),
            markMatchRunFailed: jest.fn(),
        };
        mockJob = {
            data: {
                runId: 'run-01',
                projectId: 'project-01',
                executedByUserId: 'user-01',
            },
            updateProgress: jest.fn(),
            attemptsMade: 0,
            opts: { attempts: 3 },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchRunProcessor,
                { provide: MatchRunService, useValue: mockMatchRunService },
            ],
        }).compile();

        processor = module.get<MatchRunProcessor>(MatchRunProcessor);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('successfully processes the job and delegates it to executeMatchRun', async () => {
        mockMatchRunService.executeMatchRun.mockResolvedValue({ runId: 'run-01', results: [] });

        await processor.process(mockJob);

        expect(mockMatchRunService.executeMatchRun).toHaveBeenCalledWith(
            'project-01',
            'user-01',
            'run-01',
            expect.any(Function),
        );
        expect(mockMatchRunService.markMatchRunFailed).not.toHaveBeenCalled();
    });

    it('should execute the progress callback correctly', async () => {

        mockMatchRunService.executeMatchRun.mockImplementation(
            async (projectId, userId, runId, onProgress) => {
                await onProgress(50);
                return { runId, results: [] };
            },
        );

        await processor.process(mockJob);

        expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
        expect(mockMatchRunService.updateMatchRunProgress).toHaveBeenCalledWith('run-01', 50);
    });

    it('throws error and does NOT mark as failed if attempts are remaining', async () => {
        const mockError = new Error('Scoring engine timed out');
        mockMatchRunService.executeMatchRun.mockRejectedValue(mockError);

        mockJob.attemptsMade = 0;
        mockJob.opts.attempts = 3;

        await expect(processor.process(mockJob)).rejects.toThrow(mockError);

        expect(mockMatchRunService.markMatchRunFailed).not.toHaveBeenCalled();
    });

    it('marks match run as failed if max attempts are reached', async () => {
        const mockError = new Error('Fatal database connection lost');
        mockMatchRunService.executeMatchRun.mockRejectedValue(mockError);
        mockJob.attemptsMade = 2;
        mockJob.opts.attempts = 3;

        await expect(processor.process(mockJob)).rejects.toThrow(mockError);

        expect(mockMatchRunService.markMatchRunFailed).toHaveBeenCalledWith('run-01', mockError);
    });

    it('marks match run as failed if job.opts.attempts is undefined (fallback to 1)', async () => {
        const mockError = new Error('Unexpected crash');
        mockMatchRunService.executeMatchRun.mockRejectedValue(mockError);

        mockJob.attemptsMade = 0;
        mockJob.opts.attempts = undefined;

        await expect(processor.process(mockJob)).rejects.toThrow(mockError);

        expect(mockMatchRunService.markMatchRunFailed).toHaveBeenCalledWith('run-01', mockError);
    });
});