import { Injectable } from '@nestjs/common';
import { EntryScoringDataDto } from '../../dto/entry-data.dto';
import { NormalizationService } from './normalization.service';
import { ScoringFactor } from '../../enums/scoring-factor.enum';
import { ResolvedScoringContext } from '../interfaces/context.interface';
import { ScoringService } from '../scoring-config.service';

export interface ProjectScoringContext {
  projectId: string;
  activeWeights: Record<ScoringFactor, number>;
  activeFactors: Set<ScoringFactor>;
  excludedFactors: Set<ScoringFactor>;
}
@Injectable()
export class DataIngestionService {
  constructor(
    private readonly normalizationService: NormalizationService,
    private readonly scoringService: ScoringService,
  ) {}

  async ingestData(dto: EntryScoringDataDto): Promise<ResolvedScoringContext> {
    const projectContext = await this.getProjectScoringContext(dto.projectId);
    return {
      consultantId: dto.consultantId,
      ...projectContext,
    };
  }

  async getProjectScoringContext(
    projectId: string,
  ): Promise<ProjectScoringContext> {
    const activeWeights =
      await this.scoringService.resolveProjectWeights(projectId);

    const rawWeights: Partial<Record<ScoringFactor, number>> = {};
    const activeFactors = new Set<ScoringFactor>();
    const excludedFactors = new Set<ScoringFactor>();

    for (const row of activeWeights) {
      const factor = row.factorName as ScoringFactor;
      if (row.active) {
        rawWeights[factor] =
          'overrideWeight' in row
            ? row.overrideWeight
            : (row as { weight: number }).weight;
        activeFactors.add(factor);
      }

      const isExcluded = row.hardExclusionEnabled === true;
      if (isExcluded) {
        excludedFactors.add(factor);
      }
    }

    const normalizedWeights =
      this.normalizationService.normalizeWeights(rawWeights);

    return {
      projectId,
      activeWeights: normalizedWeights,
      activeFactors,
      excludedFactors,
    };
  }
}
