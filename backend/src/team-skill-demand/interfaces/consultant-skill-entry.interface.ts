import { CompetencyLevel } from '@prisma/client';

export interface ConsultantSkillEntry {
  consultantId: string;
  skillId: string;
  competencyLevel: CompetencyLevel;
}