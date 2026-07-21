import { Injectable } from '@nestjs/common';
import { ScoringFactor } from '../../enums/scoring-factor.enum';
import {
  WeightedFactorBreakdown,
  ConsultantMatchResult,
} from '../interfaces/match-result.interface';

export interface ScoredConsultant {
  consultantId: string;
  consultantName: string;
  factorScores: Partial<Record<ScoringFactor, number>>;
  weights: Partial<Record<ScoringFactor, number>>;
}

export interface ScoredConsultantsResult {
  consultantId: string;
  finalScore: number;
  factorBreakdown: WeightedFactorBreakdown[];
}

//Round to 2 decimal
//  places for the score and 4 decimal places for the factor breakdown

type AggregatedConsultant = ConsultantMatchResult;

const FINAL_SCORE_DECIMAL_PLACES = 100;
const FACTOR_BREAKDOWN_DECIMAL_PLACES = 10000;

function round(value: number, precision: number): number {
  return Math.round(value * precision) / precision;
}

@Injectable()
export class WeightedAggregator {
  aggregate(consultants: ScoredConsultant[]): AggregatedConsultant[] {
    // score every consultant
    const scored = consultants.map((consultant) => this.scoreOne(consultant));

    scored.sort((a, b) => b.finalScore - a.finalScore);
    return scored.map((consultant, index) => ({
      ...consultant,
      rank: index + 1,
    }));
  }

  private scoreOne(
    consultant: ScoredConsultant,
  ): Omit<AggregatedConsultant, 'rank'> {
    const factors = Array.from(
      new Set([
        ...Object.keys(consultant.factorScores),
        ...Object.keys(consultant.weights),
      ]),
    ) as ScoringFactor[];

    let sum = 0;

    const factorBreakdown: WeightedFactorBreakdown[] = factors.map((factor) => {
      const rawScore = consultant.factorScores[factor] ?? 0;
      const weight = consultant.weights[factor] ?? 0;
      const exactContribution = rawScore * weight;

      sum += exactContribution;
      return {
        factor,
        rawScore: round(rawScore, FACTOR_BREAKDOWN_DECIMAL_PLACES),
        weight: round(weight, FACTOR_BREAKDOWN_DECIMAL_PLACES),
        weightedContribution: round(
          exactContribution,
          FACTOR_BREAKDOWN_DECIMAL_PLACES,
        ),
      };
    });

    return {
      consultantId: consultant.consultantId,
      consultantName: consultant.consultantName,
      finalScore: round(sum * 100, FINAL_SCORE_DECIMAL_PLACES),
      factorBreakdown,
    };
  }
}
