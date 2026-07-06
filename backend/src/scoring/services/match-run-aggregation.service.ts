import { Injectable } from "@nestjs/common";
import { ScoringResults } from "./scoring.orchestrator";
import { WeightedAggregator, ScoredConsultant } from "./weighted-aggregator";
import { ConsultantMatchResult } from "./match-result.interface";


export interface ScoredConsultantInput {
    consultantId: string;
    outcome: ScoringResults;
}

// Match Run Initialisation

@Injectable()
export class MatchRunAggregationService {
    constructor(private readonly weightedAggregator: WeightedAggregator) { }

    buildResults(inputs: ScoredConsultantInput[]): ConsultantMatchResult[] {
        const filtered = inputs.filter(
            (input): input is ScoredConsultantInput & {
                outcome: Extract<ScoringResults, { excluded: false }>;
            } => input.outcome.excluded === false,
        );



        const aggregator: ScoredConsultant[] = filtered.map((input) => ({
            consultantId: input.consultantId,
            factorScores: input.outcome.factorScores,
            weights: input.outcome.redistributedWeights,
        }));

        return this.weightedAggregator.aggregate(aggregator);
    }

}