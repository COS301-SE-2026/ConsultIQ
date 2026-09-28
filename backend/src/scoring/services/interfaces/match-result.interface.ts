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

export type ProjectAvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE';
export interface ConsultantMatchResult {
  consultantId: string;
  consultantName: string;
  consultantEmail: string;
  finalScore: number;
  rank: number;
  factorBreakdown: WeightedFactorBreakdown[];
  isPlaced: boolean;
  projectAvailabilityStatus: ProjectAvailabilityStatus;
}

export interface MatchRunStats {
  totalEvaluated: number;
  totalExcluded: number;
  totalMatched: number;
  totalPlaced: number;
}

export function deriveProjectAvailabilityStatus(
  factorBreakdown: WeightedFactorBreakdown[],
): ProjectAvailabilityStatus {
  const  availabilityEntry = factorBreakdown.find(
    (f) => f.factor === ScoringFactor.AVAILABILITY,
  );

  if(!availabilityEntry) {
    return 'AVAILABLE';
  }

  return availabilityEntry.rawScore >= 1 ? 'AVAILABLE' : 'UNAVAILABLE'
}
