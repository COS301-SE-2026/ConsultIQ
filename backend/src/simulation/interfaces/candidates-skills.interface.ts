import { CompetencyLevel } from '@prisma/client';
import { RawConsultantDto } from '../../scoring/dto/raw-consultant.dto';
import { HypotheticalSkillInput } from '../interfaces/simulation-result.interface';

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