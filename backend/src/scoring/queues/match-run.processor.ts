import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MatchRunService } from '../services/match-run.service';

interface MatchRunJob {
  runId: string;
  projectId: string;
  executedByUserId: string;
}

@Processor('match-run')
export class MatchRunProcessor extends WorkerHost {
  constructor(private readonly matchRunService: MatchRunService) {
    super();
  }

  async process(job: Job<MatchRunJob>): Promise<void> {
    try {
      await this.matchRunService.executeMatchRun(
        job.data.projectId,
        job.data.executedByUserId,
        job.data.runId,
        async (progress) => {
          await job.updateProgress(progress);
          await this.matchRunService.updateMatchRunProgress(job.data.runId, progress);
        },
      );
    } catch (error) {
      if ((job.attemptsMade + 1) >= (job.opts.attempts ?? 1)) {
        await this.matchRunService.markMatchRunFailed(job.data.runId, error);
      }
      throw error;
    }
  }
}