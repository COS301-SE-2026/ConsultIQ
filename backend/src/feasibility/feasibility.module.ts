import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { FeasibilityController } from '../controllers/feasibility/feasibility.controller';
import { FeasibilityService } from './services/feasibility.service';
import { VariantGenerator } from './services/variant-generator';
import { ResponseSanitizer } from './services/response-sanitizer';
import { FeasibilityCacheService } from './services/feasibility-cache.service';
import { FeasibilityThrottlerGuard } from './services/feasibility-throttler.guard';

@Module({
  imports: [ScoringModule],
  controllers: [FeasibilityController],
  providers: [
    FeasibilityService,
    VariantGenerator,
    ResponseSanitizer,
    FeasibilityCacheService,
    FeasibilityThrottlerGuard,
  ],
})
export class FeasibilityModule {}