import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';
import { SimulationService } from '../../simulation/services/simulation.service';
import { SkillGrowthCacheService } from '../../simulation/services/skill-growth-cache.service';
import { SkillGrowthThrottlerGuard } from '../../simulation/services/skill-growth-throttler.guard';
import { SkillGrowthResponse } from '../../simulation/interfaces/skill-growth-response.interface';

@Controller('consultants/me/skill-growth')
@UseGuards(SkillGrowthThrottlerGuard)
export class SkillGrowthController {
  constructor(
    private readonly simulationService: SimulationService,
    private readonly cache: SkillGrowthCacheService,
  ) {}

  @Get()
  @Roles(Role.CONSULTANT)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async getSkillGrowth(
    @Req() req: { user?: { userId?: string } },
  ): Promise<SkillGrowthResponse> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const cached = await this.cache.get(userId);
    if (cached) return cached;

    const response = await this.simulationService.getSkillRecommendationsForUser(userId);
    await this.cache.set(userId, response);
    return response;
  }
}