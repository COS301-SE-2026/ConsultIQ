import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { SimulationService } from './services/simulation.service';

@Module({
  imports: [ScoringModule],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}