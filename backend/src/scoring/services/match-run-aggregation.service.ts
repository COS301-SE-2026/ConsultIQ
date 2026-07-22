import { Injectable } from '@nestjs/common';
import { ScoringResults } from './scoring.orchestrator';
import {
  WeightedAggregator,
  ScoredConsultant,
} from './weight-aggregator/weighted-aggregator';
import { ConsultantMatchResult } from './interfaces/match-result.interface';

export interface ScoredConsultantInput {
  consultantId: string;
  consultantName: string;
  consultantEmail: string;
  outcome: ScoringResults;
}
//pointer to consultant that passed all hard exclusion checks
type ValidScoredConsultant = ScoredConsultantInput & {
  outcome: Extract<ScoringResults, { excluded: false }>;
};

// Match Run Initialisation

@Injectable()
export class MatchRunAggregationService {
  constructor(private readonly weightedAggregator: WeightedAggregator) { }

  buildResults(inputs: ScoredConsultantInput[]): ConsultantMatchResult[] {
    const eligibleConsultants = this.filterEligibleConsultants(inputs);
    const aggregatorPayload = this.mapToAggregatorPayload(eligibleConsultants);
    return this.weightedAggregator.aggregate(aggregatorPayload);
  }

  private filterEligibleConsultants(
    inputs: ScoredConsultantInput[],
  ): ValidScoredConsultant[] {
    return inputs.filter(
      (input): input is ValidScoredConsultant =>
        input.outcome.excluded === false,
    );
  }

  private mapToAggregatorPayload(
    inputs: ValidScoredConsultant[],
  ): ScoredConsultant[] {
    return inputs.map((input) => ({
      consultantId: input.consultantId,
      consultantName: input.consultantName,
      consultantEmail: input.consultantEmail,
      factorScores: input.outcome.factorScores,
      weights: input.outcome.redistributedWeights,
    }));
  }
}
