import { Injectable, Logger } from '@nestjs/common';
import { ScoringPipelineService } from './scoring-pipeline.service';
import {
  MatchRunAggregationService,
  ScoredConsultantInput,
} from './match-run-aggregation.service';
import { RawProjectDto } from '../dto/raw-project.dto';
import { ResolvedScoringContext } from './interfaces/context.interface';
import { ConsultantPoolEntry } from './interfaces/consultant-pool-entry.interface';
import { ScoringExecutionResult } from './interfaces/scoring-execution-result.interface';

/**
 * The persistence-free core of match scoring.
 *
 * MatchRunService (real, persisted match runs) and FeasibilityService
 * (read-only, non-persisting previews) both call this.
 */
@Injectable()
export class MatchScoringExecutorService {
  private static readonly SCORING_CONCURRENCY = 25;
  private readonly logger = new Logger(MatchScoringExecutorService.name);

  constructor(
    private readonly scoringPipeline: ScoringPipelineService,
    private readonly aggregation: MatchRunAggregationService,
  ) {}

  async scorePool(
    projectDto: RawProjectDto,
    pool: ConsultantPoolEntry[],
    scoringContext: Omit<ResolvedScoringContext, 'consultantId'>,
    allocationsByConsultant: ReadonlyMap<string, number>,
  ): Promise<ScoringExecutionResult> {
    const scoreOne = async (entry: ConsultantPoolEntry) => {
      const outcome = await this.scoringPipeline.scoreConsultant(
        {
          consultantId: entry.consultantId,
          projectId: projectDto.projectId,
          consultant: entry.consultant,
          project: projectDto,
        },
        scoringContext,
        allocationsByConsultant,
      );
      return {
        consultantId: entry.consultantId,
        consultantName: entry.consultantName,
        consultantEmail: entry.consultantEmail,
        isPlaced: entry.isPlaced,
        outcome,
      };
    };

    const settled = await this.scoreWithConcurrency(
      pool,
      scoreOne,
      MatchScoringExecutorService.SCORING_CONCURRENCY,
    );

    const scoredInputs: ScoredConsultantInput[] = [];
    let errorCount = 0;

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        scoredInputs.push(result.value);
      } else {
        this.logger.error(`Failed to score consultant: ${result.reason}`);
        errorCount++;
      }
    }

    const finalResults = this.aggregation.buildResults(scoredInputs);
    const logicallyExcludedCount = scoredInputs.filter(
      (s) => s.outcome.excluded,
    ).length;

    return {
      finalResults,
      excludedCount: logicallyExcludedCount + errorCount,
      errorCount,
    };
  }

  private async scoreWithConcurrency<T, R>(
    items: T[],
    scorer: (item: T) => Promise<R>,
    concurrency: number,
  ): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (true) {
        const index = nextIndex++;
        if (index >= items.length) return;
        try {
          results[index] = {
            status: 'fulfilled',
            value: await scorer(items[index]),
          };
        } catch (reason) {
          results[index] = { status: 'rejected', reason };
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(Math.max(concurrency, 1), items.length) },
        () => worker(),
      ),
    );

    return results;
  }
}