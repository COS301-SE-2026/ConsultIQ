import { Controller, Post, Get, Param, Request, UseGuards } from '@nestjs/common';
import { MatchRunService } from '../../scoring/services/match-run.service';
import { ConsultantMatchResult } from '../../scoring/services/match-result.interface';


@Controller('projects/:id/match-run')
export class MatchRunController {
    constructor(
        private readonly matchRunService: MatchRunService
    ) { }

    @Post()
    async executeMatchRun(
        @Param('id') projectId: string,
        @Request() req: any,
    ): Promise<ConsultantMatchResult[]> {

        const userId = req.user.id;
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