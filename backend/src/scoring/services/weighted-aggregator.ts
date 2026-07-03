import { Injectable } from "@nestjs/common";
import { ScoringFactor } from "../enums/scoring-factor.enum";
import { WeightedFactorBreakdown } from "./match-result.interface";


export interface ScoredConsultant {
    consultatId: string;
    factorScores: Partial<Record<ScoringFactor, number>>;
    weights: Partial<Record<ScoringFactor, number>>;
}

export interface ScoredConsultantsResult {
    consutlatId: string;
    finalScore: number;
    rank: number;
    factorBreakdown: WeightedFactorBreakdown[];

}

//Round to 2 decimal places for the score and 4 decimal places for the factor breakdown

const FINAL_SCORE_DECIMAL_PLACES = 100;
const FACTOR_BREAKDOWN_DECIMAL_PLACES = 10000;

function round(value: number, precision: number): number {
    return Math.round(value * precision) / precision;
}


@Injectable()
export class WeightedAggregator {
    aggregate(consultants: ScoredConsultant[]): ScoredConsultantsResult[] {

        // score every consultant
        const scored = consultants.map((consultant) => this.scoreOne(consultant),);

        scored.sort((a, b) => b.finalScore - a.finalScore);
        return scored.map((consultant, index) => ({ ...consultant, rank: index + 1 }));

    }


    private scoreOne(consultant: ScoredConsultant): Omit<ScoredConsultantsResult, 'rank'> {

        const factors = Object.keys(consultant.factorScores) as ScoringFactor[];

        let sum = 0;

        const factorBreakdown: WeightedFactorBreakdown[] = factors.map((factor) => {
            const rawScore = consultant.factorScores[factor] ?? 0;
            const weight = consultant.weights[factor] ?? 0;
            const exactContribution = rawScore * weight;

            sum += exactContribution;
            return {
                factor,
                rawScore: round(rawScore, FACTOR_BREAKDOWN_DECIMAL_PLACES),
                score: round(rawScore, FACTOR_BREAKDOWN_DECIMAL_PLACES),
                weight: round(weight, FACTOR_BREAKDOWN_DECIMAL_PLACES),
                weightedContribution: round(exactContribution, FACTOR_BREAKDOWN_DECIMAL_PLACES),
            }
        });

        return {
            consutlatId: consultant.consultatId,
            finalScore: round(sum * 100, FINAL_SCORE_DECIMAL_PLACES),
            factorBreakdown,
        }
    }
}