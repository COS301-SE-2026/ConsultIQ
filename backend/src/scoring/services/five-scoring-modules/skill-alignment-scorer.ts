import { Injectable, Logger } from '@nestjs/common';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { FactorScoreResult } from '../interfaces/factor-score-result.interface';


@Injectable()
export class SkillAligmentScorer {
  private readonly logger = new Logger(SkillAligmentScorer.name);

  score(
    consultant: RawConsultantDto,
    project: RawProjectDto,
  ): FactorScoreResult {
    const { requiredSkills } = project;

    //if project has no skills required
    if (!requiredSkills || requiredSkills.length === 0) {
      this.logger.warn(
        `Project ${project.projectId} has no required skills defined`,
      );
      return {
        score: 0,
        triggerHardExclusion: true,
        details: 'Invalid data: Project has no required skills defined'

      };
    }

    const normalizeSkills = (skill: { skillName: string }) =>
      skill.skillName.trim().toLowerCase();
    const possessedSkillNames = new Set(
      (consultant.skills || []).map(normalizeSkills),
    );

    let possessedCount = 0;
    const missingMandatorySkills: string[] = [];
    const missingSkills: string[] = [];

    for (const req of requiredSkills) {
      const normalizeReqName = req.skillName.trim().toLocaleLowerCase();

      if (possessedSkillNames.has(normalizeReqName)) {
        possessedCount++;
      } else {
        missingSkills.push(req.skillName);
        if (req.isMandatory) {
          missingMandatorySkills.push(req.skillName);
        }
      }
    }

    const rawScore = possessedCount / requiredSkills.length;
    const score = Math.min(1, Math.max(0, rawScore));
    const missingText = missingSkills.length > 0
      ? ` (Missing: ${missingSkills.join(', ')})`
      : '';

    return {
      score,
      triggerHardExclusion: missingMandatorySkills.length > 0,
      missingMandatorySkills:
        missingMandatorySkills.length > 0 ? missingMandatorySkills : undefined,

      details: `Matched ${possessedCount} of ${requiredSkills.length} skills${missingText}`
    };
  }
}
