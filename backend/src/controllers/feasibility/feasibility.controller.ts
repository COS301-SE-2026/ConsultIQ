// scoring/services/feasibility/feasibility.controller.ts
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';
import { FeasibilityCheckRequestDto } from '../../feasibility/dto/feasibility-check-request.dto';
import { FeasibilityService } from '../../feasibility/services/feasibility.service';
import { FeasibilityCheckResponse } from '../../feasibility/interface/feasibility-response.interface';
import { FeasibilityThrottlerGuard } from '../../feasibility/services/feasibility-throttler.guard';
import { ResponseSanitizer } from '../../feasibility/services/response-sanitizer';
import { FeasibilityCacheService } from '../../feasibility/services/feasibility-cache.service';

@Controller('projects/feasibility-check')
@UseGuards(FeasibilityThrottlerGuard)
export class FeasibilityController {
  constructor(
    private readonly feasibilityService: FeasibilityService,
    private readonly sanitizer: ResponseSanitizer,
    private readonly cache: FeasibilityCacheService,
  ) {}

  @Post()
  @Roles(Role.PROJECT_MANAGER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async checkFeasibility(
    @Body() dto: FeasibilityCheckRequestDto,
    @Req() req: any,
  ): Promise<FeasibilityCheckResponse> {
    const userId = req.user?.userId;

    const cached = await this.cache.get(userId, dto);
    if (cached) return cached;

    const result = await this.feasibilityService.checkFeasibility(dto);
    const sanitized: FeasibilityCheckResponse = {
      eligibleCount: this.sanitizer.sanitizeCount(result.eligibleCount),
      topScore: this.sanitizer.sanitizeScore(result.topScore),
      variants: result.variants.map((v) => ({
        label: v.label,
        eligibleCount: this.sanitizer.sanitizeCount(v.eligibleCount),
        topScore: this.sanitizer.sanitizeScore(v.topScore),
      })),
    };

    await this.cache.set(userId, dto, sanitized);
    return sanitized;
  }
}