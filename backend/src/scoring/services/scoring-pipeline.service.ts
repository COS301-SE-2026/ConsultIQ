import { Injectable } from '@nestjs/common';
import { EntryScoringDataDto } from '../dto/entry-data.dto';
import { DataIngestionService } from './data-normalization/data-ingestion.service';
import { ScoringOrchestrator, ScoringResults } from './scoring.orchestrator';
import { ResolvedScoringContext } from './interfaces/context.interface';

type SharedScoringContext = Omit<ResolvedScoringContext, 'consultantId'>;

/**
 *
 * Integration of the Scoring factors and data ingestion
 * score-orchestrator + data ingestion and normalization
 */

@Injectable()
export class ScoringPipelineService {
  constructor(
    private readonly dataIngestionService: DataIngestionService,
    private readonly scoringOrchestrator: ScoringOrchestrator,
  ) { }

  async scoreConsultant(
    dto: EntryScoringDataDto,
    resolvedContext?: SharedScoringContext,
    availabilityAllocations?: ReadonlyMap<string, number>,
  ): Promise<ScoringResults> {
    const result = resolvedContext ?? await this.dataIngestionService.ingestData(dto);

    if (availabilityAllocations === undefined) {
      return this.scoringOrchestrator.scoreConsultant(
        dto.consultant,
        dto.project,
        result.activeWeights,
        result.activeFactors,
        result.excludedFactors,
      );
    }

    return this.scoringOrchestrator.scoreConsultant(
      dto.consultant,
      dto.project,
      result.activeWeights,
      result.activeFactors,
      result.excludedFactors,
      availabilityAllocations,
    );
  }
}
