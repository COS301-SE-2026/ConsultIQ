import { ScoringFactor } from '../../enums/scoring-factor.enum';

export interface ResolvedScoringContext {
  consultantId: string;
  projectId: string;
  activeWeights: Record<ScoringFactor, number>;
  activeFactors: Set<ScoringFactor>;
  excludedFactors: Set<ScoringFactor>;
}
