import { CompetencyLevel } from '@prisma/client';

export interface ProjectSkillRequirement {
  projectId: string;
  skillId: string;
  skillName: string;
  competency: CompetencyLevel;
  mandatory: boolean;
}