import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';
import { TeamSkillDemandService } from '../../team-skill-demand/services/team-skill-demand.service';
import { TeamSkillDemandResponse } from '../../team-skill-demand/interfaces/team-skill-demand-response.interface';

@Controller('consultant-managers/me/skill-demand')
export class TeamSkillDemandController {
  constructor(private readonly teamSkillDemandService: TeamSkillDemandService) {}

  @Get()
  @Roles(Role.CONSULTANT_MANAGER)
  async getTeamSkillDemand(@Req() req: any): Promise<TeamSkillDemandResponse> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.teamSkillDemandService.getTeamSkillDemandForManager(userId);
  }
}