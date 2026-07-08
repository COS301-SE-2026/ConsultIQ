import { Module } from "@nestjs/common";
import { DataIngestionService } from "./services/data-ingestion.service";
import { NormalizationService } from "./services/normalization.service";
import { SkillAligmentScorer } from "./services/skill-alignment-scorer";
import { CompetencyMatchScorer } from "./services/competency-match-scorer";
import { GeographicFitScorer } from "./services/geographic-fit.scorer";
import { AvailabilityFitScorer } from "./services/availability-fit.scorer";
import { ScoringOrchestrator } from "./services/scoring.orchestrator";
import { ScoringPipelineService } from "./services/scoring-pipeline.service";
import { CostFitScorer } from "./services/cost-fit.scorer";
import { MatchRunAggregationService } from "./services/match-run-aggregation.service";
import { WeightedAggregator } from "./services/weighted-aggregator";
import { MatchRunController } from "../controllers/scoring-engine/match-run.controller";

@Module({
    controllers: [MatchRunController],
    providers: [
        //Phase 1: Data ingestion and Normalization
        DataIngestionService,
        NormalizationService,

        //Phase 2: Scoring processor (Individual Scoring Factors)
        SkillAligmentScorer,
        CompetencyMatchScorer,
        CostFitScorer,
        GeographicFitScorer,
        AvailabilityFitScorer,
        ScoringOrchestrator,

        //(Phase 1 + Phase 2)
        //Data ingestion and normalization + Scoring Processor
        ScoringPipelineService,

        MatchRunAggregationService,
        WeightedAggregator,

    ],
    exports: [ScoringPipelineService]
})

export class ScoringModule { }