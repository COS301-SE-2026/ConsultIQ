import {
  Controller,
  Post,
  Get,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MatchRunService } from '../../scoring/services/match-run.service';
import { ConsultantMatchResult } from '../../scoring/services/interfaces/match-result.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MatchRunStats } from '../../scoring/services/interfaces/match-result.interface';
import { Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';
@Controller('projects/:id/match-run')
export class MatchRunController {
  constructor(private readonly matchRunService: MatchRunService) { }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @Post()
  async executeMatchRun(
    @Param('id') projectId: string,
    @Request() req: any,
  ): Promise<{ runId: string; status: 'IN_PROGRESS' }> {
    const userId = req.user.userId;
    return this.matchRunService.enqueueMatchRun(projectId, userId);
  }

  @Get(':runId')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  async getMatchRun(
    @Param('id') projectId: string,
    @Param('runId') runId: string,
  ): Promise<ConsultantMatchResult[]> {
    return this.matchRunService.getMatchRun(projectId, runId);
  }

  @Get(':runId/status')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  async getMatchRunStatus(
    @Param('id') projectId: string,
    @Param('runId') runId: string,
  ) {
    return this.matchRunService.getMatchRunStatus(projectId, runId);
  }

  @Get(':runId/stats')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  async getMatchRunStats(
    @Param('id') projectId: string,
    @Param('runId') runId: string,
  ): Promise<MatchRunStats> {
    return this.matchRunService.getMatchRunStats(projectId, runId);
  }
}
