import { TeamSkillDemandItem } from './team-skill-demand-item.interface';

export interface TeamSkillDemandResponse {
  teamSize: number;
  skills: TeamSkillDemandItem[];
}