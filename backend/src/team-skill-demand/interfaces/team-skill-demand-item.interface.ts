import { ConsultantSummary } from './consultant-summary.interface';

export interface TeamSkillDemandItem {
  skillName: string;
  supply: number;
  trainingGap: number;
  projectsRequiringSkill: number;
  uncoveredProjectCount: number;
  consultantsWithSkill: ConsultantSummary[];
  consultantsNeedingTraining: ConsultantSummary[];
}

export interface TeamSkillDemandItem {
  skillName: string;
  supply: number;
  trainingGap: number;
  projectsRequiringSkill: number;
  uncoveredProjectCount: number;
}