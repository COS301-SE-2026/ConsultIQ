import { ScoringFactor } from '../enums/scoring-factor.enum';
import { CompetencyMatchScorer } from './five-scoring-modules/competency-match-scorer';
import { CostFitScorer } from './five-scoring-modules/cost-fit.scorer';
import { GeographicFitScorer } from './five-scoring-modules/geographic-fit.scorer';
import { SkillAligmentScorer } from './five-scoring-modules/skill-alignment-scorer';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AvailabilityFitScorer } from './five-scoring-modules/availability-fit.scorer';
import { RawProjectDto } from '../dto/raw-project.dto';
import { RawConsultantDto } from '../dto/raw-consultant.dto';

export type ScoringResults =
  | {
    excluded: false;
    factorScores: Partial<Record<ScoringFactor, number>>;
    redistributedWeights: Partial<Record<ScoringFactor, number>>;
  }
  | {
    excluded: true;
    reason: string;
    missingMandatorySkills: string[];
  };
/*
Calcaute the five scoring factors considering the avtive ones and redistributing inactive weights into the active weights if the weights are not redistributed
*/

@Injectable()
export class ScoringOrchestrator {
  constructor(
    private readonly skillAlignment: SkillAligmentScorer,
    private readonly competencyMatchScorer: CompetencyMatchScorer,
    private readonly costFitScorer: CostFitScorer,
    private readonly geographicFitScorer: GeographicFitScorer,
    private readonly availabilityFitScorer: AvailabilityFitScorer,
  ) { }

  async scoreConsultant(
    consultant: RawConsultantDto,
    project: RawProjectDto,
    resolvedWeights: Record<ScoringFactor, number>,
    activeFactors: Set<ScoringFactor>,
  ): Promise<ScoringResults> {
    const scoresByFactor: Partial<Record<ScoringFactor, number>> = {};

    if (activeFactors.has(ScoringFactor.SKILL_ALIGNMENT)) {
      const skillResult = this.skillAlignment.score(consultant, project);

      if (skillResult.triggerHardExclusion) {
        return {
          excluded: true,
          reason: 'Consultant does not meet mandatory skill requirements',
          missingMandatorySkills: skillResult.missingMandatorySkills ?? [],
        };
      }
      scoresByFactor[ScoringFactor.SKILL_ALIGNMENT] = skillResult.score;
    }

    if (activeFactors.has(ScoringFactor.COMPETENCY_LEVEL)) {
      const competencyResult = this.competencyMatchScorer.score(
        consultant,
        project,
      );
      scoresByFactor[ScoringFactor.COMPETENCY_LEVEL] = competencyResult.score;
    }

    if (activeFactors.has(ScoringFactor.COST_TO_COMPANY)) {
      const costFitResult = this.costFitScorer.score(consultant, project);
      scoresByFactor[ScoringFactor.COST_TO_COMPANY] = costFitResult.score;
    }

    if (activeFactors.has(ScoringFactor.LOCATION)) {
      const geographicFitResult = this.geographicFitScorer.score(
        consultant,
        project,
      );
      scoresByFactor[ScoringFactor.LOCATION] = geographicFitResult.score;
    }

    if (activeFactors.has(ScoringFactor.AVAILABILITY)) {
      scoresByFactor[ScoringFactor.AVAILABILITY] = (
        await this.availabilityFitScorer.score(consultant, project)
      ).score;
    }

    const redistributedWeights = this.redistributedWeights(resolvedWeights, activeFactors);

    return {
      excluded: false,
      factorScores: scoresByFactor,
      redistributedWeights: redistributedWeights,
    };
  }

  /*
    if a factor is inactiated the weights should be redistributed to the other factors equally so we do not loose the 1.0 full rating
    */
  private redistributedWeights(
    resolvedWeights: Record<ScoringFactor, number>,
    activeFactors: Set<ScoringFactor>,
  ): Partial<Record<ScoringFactor, number>> {
    const allFactors = Object.keys(resolvedWeights) as ScoringFactor[];

    const activeFactorList = allFactors.filter((factor) => activeFactors.has(factor));

    const inactiveFactors = allFactors.filter((factor) => !activeFactors.has(factor));


    if (inactiveFactors.length === 0) {
      return resolvedWeights;
    }

    const inactiveWeightSum = inactiveFactors.reduce(
      (sum, factor) => sum + resolvedWeights[factor],
      0,
    );
    const activeWeightSum = activeFactorList.reduce(
      (sum, factor) => sum + resolvedWeights[factor],
      0,
    );

    // all factors are inactive
    if (activeWeightSum <= 0 || activeFactorList.length === 0) {
      throw new InternalServerErrorException(
        `Invalid scoring configurations: All scoring factors are inactive or have zero weight`
      )
    }

    const redistributedWeights: Partial<Record<ScoringFactor, number>> = {};
    for (const factor of activeFactors) {
      redistributedWeights[factor] =
        resolvedWeights[factor] +
        (resolvedWeights[factor] / activeWeightSum) * inactiveWeightSum;
    }

    return redistributedWeights;
  }
}
