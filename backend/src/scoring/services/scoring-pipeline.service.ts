import { Injectable } from '@nestjs/common';
import { EntryScoringDataDto } from '../dto/entry-data.dto';
import { DataIngestionService } from './data-normalization/data-ingestion.service';
import { ScoringOrchestrator, ScoringResults } from './scoring.orchestrator';

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
  ) {}

  async scoreConsultant(dto: EntryScoringDataDto): Promise<ScoringResults> {
    const result = await this.dataIngestionService.ingestData(dto);

    return this.scoringOrchestrator.scoreConsultant(
      dto.consultant,
      dto.project,
      result.activeWeights,
      result.activeFactors,
    );
  }
}
