import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Req,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ScoringService } from '../../scoring/services/scoring-config.service';
import { UpdateScoringConfigDto } from '../../scoring/dto/update-scoring-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  UpdateProjectScoringOverrideDto,
  DeleteProjectScoringOverrideDto,
} from '../../scoring/dto/update-project-scoring-override.dto';
import { Role } from '../../auth/enums/role.enum';
import { Roles } from '../../common/guards/roles.guard';

@Controller('config/scoring')
@UseGuards(JwtAuthGuard)
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get()
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.OK)
  async getScoringConfig() {
    return this.scoringService.getScoringConfig();
  }

  @Put()
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
    }),
  )
  async updateScoringConfig(
    @Body() dto: UpdateScoringConfigDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.scoringService.updateScoringConfig(dto, userId);
  }

  @Put(':projectId/scoring-override')
  @Roles(Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateProjectScoringOverride(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectScoringOverrideDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.scoringService.updateProjectScoringOverride(
      projectId,
      dto,
      userId,
    );
  }

  @Delete(':projectId/scoring-override')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async deleteProjectScoringOverride(
    @Param('projectId') projectId: string,
    @Body() dto: DeleteProjectScoringOverrideDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.scoringService.deleteProjectScoringOverride(
      projectId,
      dto,
      userId,
    );
  }

  @Get(':projectId/scoring-override')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.OK)
  async getProjectScoringOverride(@Param('projectId') projectId: string) {
    return this.scoringService.getProjectScoringOverride(projectId);
  }
}
