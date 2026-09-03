import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { SkillGapService } from '../../skill-gap-analysis/services/skill-gap.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';

@Controller()
@UseGuards(JwtAuthGuard)
export class SkillGapController {
  constructor(private readonly skillGapService: SkillGapService) {}

  @Get('skill-gap-analysis/portfolio')
  @Roles(Role.PROJECT_MANAGER)
  async getPortfolioAnalysis(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Authentication required.');
    }

    return this.skillGapService.getPortfolioSkillGapAnalysis();
  }

  @Get('projects/:projectId/skill-gap-analysis')
  @Roles(Role.PROJECT_MANAGER)
  async getProjectAnalysis(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Authentication required.');
    }

    try {
      return await this.skillGapService.getProjectSkillGapAnalysis(projectId);
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found') {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }
      throw error;
    }
  }
}
