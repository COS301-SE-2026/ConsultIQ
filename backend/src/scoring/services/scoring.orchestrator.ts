import { ScoringFactor } from "../enums/scoring-factor.enum";
import { CompetencyMatchScorer } from "./five-scoring-modules/competency-match-scorer";
import { CostFitScorer } from "./five-scoring-modules/cost-fit.scorer";
import { GeographicFitScorer } from "./five-scoring-modules/geographic-fit.scorer";
import { SkillAligmentScorer } from "./five-scoring-modules/skill-alignment-scorer";
import { Inject, Injectable } from "@nestjs/common";
import { AvailabilityFitScorer } from "./five-scoring-modules/availability-fit.scorer";
import { RawProjectDto } from "../dto/raw-project.dto";
import { RawConsultantDto } from "../dto/raw-consultant.dto";
import type { FactorActivationConfig } from "./factor-activation.config";
import { STUB_FACTOR_ACTIVATION_CONFIG } from "./factor-activation.config";

export type ScoringResults = {
    excluded: false;
    factorScores: Partial<Record<ScoringFactor, number>>
    redistributedWeights: Partial<Record<ScoringFactor, number>>;
} | {
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

        @Inject('FACTOR_ACTIVATION_CONFIG')
        private readonly activationConfig: FactorActivationConfig = STUB_FACTOR_ACTIVATION_CONFIG,
    ) { }

    async scoreConsultant(consultant: RawConsultantDto, project: RawProjectDto, resolvedWeights: Record<ScoringFactor, number>): Promise<ScoringResults> {
        const scoresByFactor: Partial<Record<ScoringFactor, number>> = {};

        if (this.activationConfig.isActive[ScoringFactor.SKILL_ALIGNMENT]) {
            const skillResult = this.skillAlignment.score(consultant, project);

            if (skillResult.triggerHardExclusion && this.activationConfig.hardExclusion) {
                return {
                    excluded: true,
                    reason: "Consultant does not meet mandatory skill requirements",
                    missingMandatorySkills: skillResult.missingMandatorySkills ?? [],
                };
            }
            scoresByFactor[ScoringFactor.SKILL_ALIGNMENT] = skillResult.score;
        }

        if (this.activationConfig.isActive[ScoringFactor.COMPETENCY_MATCH]) {
            const competencyResult = this.competencyMatchScorer.score(consultant, project);
            scoresByFactor[ScoringFactor.COMPETENCY_MATCH] = competencyResult.score;
        }

        if (this.activationConfig.isActive[ScoringFactor.COST_FIT]) {
            const costFitResult = this.costFitScorer.score(consultant, project);
            scoresByFactor[ScoringFactor.COST_FIT] = costFitResult.score;
        }

        if (this.activationConfig.isActive[ScoringFactor.GEOGRAPHIC_FIT]) {
            const geographicFitResult = this.geographicFitScorer.score(consultant, project);
            scoresByFactor[ScoringFactor.GEOGRAPHIC_FIT] = geographicFitResult.score;
        }

        if (this.activationConfig.isActive[ScoringFactor.AVAILABILITY]) {
            scoresByFactor[ScoringFactor.AVAILABILITY] = (await this.availabilityFitScorer.score(consultant, project)).score;
        }

        const redistributedWeights = this.redistributedWeights(resolvedWeights);

        return {
            excluded: false,
            factorScores: scoresByFactor,
            redistributedWeights: redistributedWeights
        };
    }


    /*
    if a factor is inactiated the weights should be redistributed to the other factors equally so we do not loose the 1.0 full rating
    */
    private redistributedWeights(resolvedWeights: Record<ScoringFactor, number>): Partial<Record<ScoringFactor, number>> {
        const activeFactors = (Object.keys(resolvedWeights) as ScoringFactor[]).filter(factor => this.activationConfig.isActive[factor]);
        const inactiveFactors = (Object.keys(resolvedWeights) as ScoringFactor[]).filter(factor => !this.activationConfig.isActive[factor]);

        if (inactiveFactors.length === 0) {
            return resolvedWeights;
        }

        const inactiveWeightSum = inactiveFactors.reduce((sum, factor) => sum + resolvedWeights[factor], 0);
        const activeWeightSum = activeFactors.reduce((sum, factor) => sum + resolvedWeights[factor], 0);

        // all factors are inactive
        if (activeWeightSum <= 0) {
            return {};
        }

        const redistributedWeights: Partial<Record<ScoringFactor, number>> = {};
        for (const factor of activeFactors) {
            redistributedWeights[factor] = resolvedWeights[factor] + (resolvedWeights[factor] / activeWeightSum) * inactiveWeightSum;
        }

        return redistributedWeights;
    }

}