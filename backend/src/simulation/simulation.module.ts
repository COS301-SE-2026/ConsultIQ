import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { SimulationService } from './services/simulation.service';
import { SkillGrowthController } from 'src/controllers/simulation/skill-growth.controller';
import { SkillGrowthCacheService } from './services/skill-growth-cache.service';
import { SkillGrowthThrottlerGuard } from './services/skill-growth-throttler.guard';
@Module({
  imports: [ScoringModule],
  providers: [SimulationService,SkillGrowthCacheService,SkillGrowthThrottlerGuard],
  exports: [SimulationService],
  controllers: [SkillGrowthController],
})
export class SimulationModule {}