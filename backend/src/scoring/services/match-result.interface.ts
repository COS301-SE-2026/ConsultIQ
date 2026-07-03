import { ScoringFactor } from '../enums/scoring-factor.enum';


/*
Consultants actual score and the rank they given
- Dashboard breakdown of the score by factor
*/

export interface WeightedFactorBreakdown {
    factor: ScoringFactor;
    score: number;
    weight: number;
    weightedContribution: number;
}

export interface ExplainabilityPayload {
    primaryPositiveFactor: ScoringFactor;
    primaryNegativeFactor: ScoringFactor;
    reasons: string[];
    improvementSuggestions: string[];
}

export interface ConsultantMatchResult {
    consultantId: string;
    finalScore: number;
    rank: number;
    factorBreakdown: WeightedFactorBreakdown[];
    explainability?: ExplainabilityPayload;
}