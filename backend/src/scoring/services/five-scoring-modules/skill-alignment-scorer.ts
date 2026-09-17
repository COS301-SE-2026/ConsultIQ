import { Injectable, Logger } from '@nestjs/common';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { FactorScoreResult } from '../interfaces/factor-score-result.interface';


const MANDATORY_WEIGHT = 0.7;
const OPTIONAL_WEIGHT = 0.3;

function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase();
}

// Helper: Capitalizes the first letter of each word for clean UI display.
function formatSkillForDisplay(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

@Injectable()
export class SkillAligmentScorer {
  private readonly logger = new Logger(SkillAligmentScorer.name);

  score(
    consultant: RawConsultantDto,
    project: RawProjectDto,
  ): FactorScoreResult {
    const { requiredSkills } = project;

    // HARD EXCLUSION 1: Project has no required skills defined at all
    if (!requiredSkills || requiredSkills.length === 0) {
      this.logger.warn(
        `Project ${project.projectId} has no required skills defined`,
      );
      return {
        score: 0,
        triggerHardExclusion: true,
        details: 'Invalid data: Project has no required skills defined',
      };
    }

    // HARD EXCLUSION 2: Consultant has no skills listed at all
    if (!consultant.skills || consultant.skills.length === 0) {
      this.logger.warn(
        `Consultant ${consultant.consultantId} has no skills listed`,
      );
      return {
        score: 0,
        triggerHardExclusion: true,
        details: 'Invalid data: Consultant has no skills listed',
      };
    }

    // Deduplicate requirements and prep display names
    const dedupedReqs = new Map<string, { skillName: string; isMandatory: boolean }>();
    for (const req of requiredSkills) {
      const key = normalizeSkillName(req.skillName);
      if (!key) continue;
      const existing = dedupedReqs.get(key);
      dedupedReqs.set(key, {
        skillName: formatSkillForDisplay(req.skillName),
        isMandatory: existing ? existing.isMandatory || req.isMandatory : req.isMandatory,
      });
    }
    const uniqueReqs = [...dedupedReqs.values()];

    const possessedSkillNames = new Set(
      consultant.skills.map((skill) => normalizeSkillName(skill.skillName)),
    );

    const mandatoryReqs = uniqueReqs.filter((r) => r.isMandatory);
    const optionalReqs = uniqueReqs.filter((r) => !r.isMandatory);

    const matchedMandatorySkills: string[] = [];
    const missingMandatorySkills: string[] = [];

    const matchedOptionalSkills: string[] = [];
    const missingOptionalSkills: string[] = [];

    // Evaluate Mandatory Skills
    for (const req of mandatoryReqs) {
      if (possessedSkillNames.has(normalizeSkillName(req.skillName))) {
        matchedMandatorySkills.push(req.skillName);
      } else {
        missingMandatorySkills.push(req.skillName);
      }
    }

    // Evaluate Optional Skills
    for (const req of optionalReqs) {
      if (possessedSkillNames.has(normalizeSkillName(req.skillName))) {
        matchedOptionalSkills.push(req.skillName);
      } else {
        missingOptionalSkills.push(req.skillName);
      }
    }

    let score = 0;

    if (mandatoryReqs.length > 0 && optionalReqs.length > 0) {
      const mandatoryRatio = matchedMandatorySkills.length / mandatoryReqs.length;
      const optionalRatio = matchedOptionalSkills.length / optionalReqs.length;
      score = (MANDATORY_WEIGHT * mandatoryRatio) + (OPTIONAL_WEIGHT * optionalRatio);
    } else if (mandatoryReqs.length > 0) {
      score = matchedMandatorySkills.length / mandatoryReqs.length;
    } else if (optionalReqs.length > 0) {
      score = matchedOptionalSkills.length / optionalReqs.length;
    }

    const detailParts: string[] = [];


    if (mandatoryReqs.length > 0) {
      let text = `Mandatory skill(s): ${matchedMandatorySkills.length}/${mandatoryReqs.length} Matched`;
      if (missingMandatorySkills.length > 0) {
        text += ` (Missing: ${missingMandatorySkills.join(', ')})`;
      }
      detailParts.push(text);
    }

    // Format Optional
    if (optionalReqs.length > 0) {
      let text = `Optional skill(s): ${matchedOptionalSkills.length}/${optionalReqs.length} Matched`;
      if (missingOptionalSkills.length > 0) {
        text += ` (Missing: ${missingOptionalSkills.join(', ')})`;
      }
      detailParts.push(text);
    }

    const details = detailParts
      .map((part) => part.trim())
      .join(' | ');

    return {
      score,
      triggerHardExclusion: false,
      missingMandatorySkills: missingMandatorySkills.length > 0 ? missingMandatorySkills : undefined,
      missingOptionalSkills: missingOptionalSkills.length > 0 ? missingOptionalSkills : undefined,
      details,
    };
  }
}