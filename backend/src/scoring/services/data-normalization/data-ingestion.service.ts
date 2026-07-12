import { Injectable } from '@nestjs/common';
import { EntryScoringDataDto } from '../../dto/entry-data.dto';
import { NormalizationService } from './normalization.service';
import {
  ScoringFactor,
  STUB_CONSULTANCY_DEFAULT_WEIGHTS,
} from '../../enums/scoring-factor.enum';
import { ResolvedScoringContext } from '../interfaces/context.interface';

@Injectable()
export class DataIngestionService {
  constructor(private readonly normalizationService: NormalizationService) {}

  async ingestData(dto: EntryScoringDataDto): Promise<ResolvedScoringContext> {
    const activeWeights = await this.resolvedActiveWeights(dto.projectId);

    return {
      consultantId: dto.consultantId,
      projectId: dto.projectId,
      activeWeights,
    };
  }

  //Stand in for ConsultancyScoringConfig and ProjectScoringOverride
  private resolvedActiveWeights(
    projectId: string,
  ): Promise<Record<ScoringFactor, number>> {
    const normalized = this.normalizationService.normalizeWeights(
      STUB_CONSULTANCY_DEFAULT_WEIGHTS,
    );
    void projectId;
    return Promise.resolve(normalized);
  }
}
