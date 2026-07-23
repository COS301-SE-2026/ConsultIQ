import { Controller, Post, Get, Param, Request, UseGuards } from '@nestjs/common';
import { MatchRunService } from '../../scoring/services/match-run.service';
import { ConsultantMatchResult } from '../../scoring/services/interfaces/match-result.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('projects/:id/match-run')
export class MatchRunController {
  constructor(private readonly matchRunService: MatchRunService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  async executeMatchRun(
    @Param('id') projectId: string,
    @Request() req: any,
  ): Promise<ConsultantMatchResult[]> {

    const userId = req.user.userId;
    return this.matchRunService.executeMatchRun(projectId, userId);
  }

  @Get(':runId')
  async getMatchRun(
    @Param('id') projectId: string,
    @Param('runId') runId: string,
  ): Promise<ConsultantMatchResult[]> {
    return this.matchRunService.getMatchRun(projectId, runId);
  }
}
