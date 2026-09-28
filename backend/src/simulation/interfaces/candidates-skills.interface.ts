import { CompetencyLevel } from '@prisma/client';

/** One pipeline project's required-skill row, as fetched via
 *  fetchPipelineProjects()'s `skills.include.skill` shape. */
export interface PipelineRequiredSkill {
  skill: { name: string };
  competency: CompetencyLevel;
  mandatory: boolean;
}

export interface PipelineProject {
  skills: PipelineRequiredSkill[];
}
