import { Module } from '@nestjs/common';
import { TeamSkillDemandService } from './services/team-skill-demand.service';
import { TeamSkillDemandController } from '../controllers/team-skill-demand/team-skill-demand.controller';

@Module({
  controllers: [TeamSkillDemandController],
  providers: [TeamSkillDemandService],
})
export class TeamSkillDemandModule {}