import { ScoringFactor } from '../../enums/scoring-factor.enum';

/*
Consultants actual score and the rank they given
- Dashboard breakdown of the score by factor
*/

export interface WeightedFactorBreakdown {
  factor: ScoringFactor;
  rawScore: number;
  weight: number;
  weightedContribution: number;
  details?: string;
}

export interface ConsultantMatchResult {
  consultantId: string;
  consultantName: string;
  consultantEmail: string;
  finalScore: number;
  rank: number;
  factorBreakdown: WeightedFactorBreakdown[];
}
