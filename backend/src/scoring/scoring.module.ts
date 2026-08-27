import { Module } from '@nestjs/common';
import { DataIngestionService } from './services/data-normalization/data-ingestion.service';
import { NormalizationService } from './services/data-normalization/normalization.service';
import { SkillAligmentScorer } from './services/five-scoring-modules/skill-alignment-scorer';
import { CompetencyMatchScorer } from './services/five-scoring-modules/competency-match-scorer';
import { GeographicFitScorer } from './services/five-scoring-modules/geographic-fit.scorer';
import { AvailabilityFitScorer } from './services/five-scoring-modules/availability-fit.scorer';
import { ScoringOrchestrator } from './services/scoring.orchestrator';
import { ScoringPipelineService } from './services/scoring-pipeline.service';
import { CostFitScorer } from './services/five-scoring-modules/cost-fit.scorer';
import { MatchRunAggregationService } from './services/match-run-aggregation.service';
import { WeightedAggregator } from './services/weight-aggregator/weighted-aggregator';
import { MatchRunController } from '../controllers/scoring-engine/match-run.controller';
import { ScoringService } from './services/scoring-config.service';
import { ScoringController } from '../controllers/scoring/scoring.controller';
import { MatchRunService } from './services/match-run.service';
import { BullModule } from '@nestjs/bullmq';
import { MatchRunProcessor } from './queues/match-run.processor';
import { LocationModule } from '../location/location.module';



@Module({
  imports: [LocationModule, BullModule.registerQueue({
    name: 'match-run',
  })],
  controllers: [MatchRunController, ScoringController],
  providers: [
    ScoringService,
    //PrismaService,

    MatchRunService,
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
    MatchRunProcessor,
  ],
  exports: [ScoringPipelineService],
})
export class ScoringModule { }
