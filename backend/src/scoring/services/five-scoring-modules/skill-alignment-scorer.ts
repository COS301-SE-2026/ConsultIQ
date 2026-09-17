import { Injectable, Logger } from '@nestjs/common';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { FactorScoreResult } from '../interfaces/factor-score-result.interface';


const MANDATORY_WEIGHT = 0.7;
const OPTIONAL_WEIGHT = 0.3;

type ProcessedRequirement = { skillName: string; isMandatory: boolean };

function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase();
}

// Helper: Capitalizes the first letter of each word for clean UI display.
function formatSkillForDisplay(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

@Injectable()
export class SkillAligmentScorer {
  private readonly logger = new Logger(SkillAligmentScorer.name);

  score(consultant: RawConsultantDto, project: RawProjectDto): FactorScoreResult {

    if (!project.requiredSkills || project.requiredSkills.length === 0) {
      this.logger.warn(`Project ${project.projectId} has no required skills defined`);
      return this.buildHardExclusion('Invalid data: Project has no required skills defined');
    }

    if (!consultant.skills || consultant.skills.length === 0) {
      this.logger.warn(`Consultant ${consultant.consultantId} has no skills listed`);
      return this.buildHardExclusion('Invalid data: Consultant has no skills listed');
    }


    const uniqueReqs = this.getUniqueRequirements(project.requiredSkills);
    const mandatoryReqs = uniqueReqs.filter((r) => r.isMandatory);
    const optionalReqs = uniqueReqs.filter((r) => !r.isMandatory);

    const possessedSkillNames = new Set(
      consultant.skills.map((skill) => normalizeSkillName(skill.skillName)),
    );


    const { matched: matchedMandatory, missing: missingMandatory } =
      this.categorizeSkills(mandatoryReqs, possessedSkillNames);

    const { matched: matchedOptional, missing: missingOptional } =
      this.categorizeSkills(optionalReqs, possessedSkillNames);

    const finalScore = this.calculateScore(
      matchedMandatory.length, mandatoryReqs.length,
      matchedOptional.length, optionalReqs.length
    );

    const details = this.buildDetailsString(
      matchedMandatory.length, mandatoryReqs.length, missingMandatory,
      matchedOptional.length, optionalReqs.length, missingOptional
    );

    return {
      score: finalScore,
      triggerHardExclusion: false,
      missingMandatorySkills: missingMandatory.length > 0 ? missingMandatory : undefined,
      missingOptionalSkills: missingOptional.length > 0 ? missingOptional : undefined,
      details,
    };
  }


  private buildHardExclusion(details: string): FactorScoreResult {
    return {
      score: 0,
      triggerHardExclusion: true,
      details,
    };
  }

  private getUniqueRequirements(requiredSkills: { skillName: string; isMandatory: boolean }[]): ProcessedRequirement[] {
    const dedupedReqs = new Map<string, ProcessedRequirement>();

    for (const req of requiredSkills) {
      const key = normalizeSkillName(req.skillName);
      if (!key) continue;

      const existing = dedupedReqs.get(key);
      dedupedReqs.set(key, {
        skillName: formatSkillForDisplay(req.skillName),
        isMandatory: existing ? existing.isMandatory || req.isMandatory : req.isMandatory,
      });
    }

    return Array.from(dedupedReqs.values());
  }

  private categorizeSkills(requirements: ProcessedRequirement[], possessed: Set<string>) {
    const matched: string[] = [];
    const missing: string[] = [];

    for (const req of requirements) {
      if (possessed.has(normalizeSkillName(req.skillName))) {
        matched.push(req.skillName);
      } else {
        missing.push(req.skillName);
      }
    }

    return { matched, missing };
  }

  private calculateScore(
    matchedMandatory: number, totalMandatory: number,
    matchedOptional: number, totalOptional: number
  ): number {
    if (totalMandatory > 0 && totalOptional > 0) {
      const mandatoryRatio = matchedMandatory / totalMandatory;
      const optionalRatio = matchedOptional / totalOptional;
      return (MANDATORY_WEIGHT * mandatoryRatio) + (OPTIONAL_WEIGHT * optionalRatio);
    }

    if (totalMandatory > 0) {
      return matchedMandatory / totalMandatory;
    }

    if (totalOptional > 0) {
      return matchedOptional / totalOptional;
    }

    return 0;
  }

  private buildDetailsString(
    matchedMandatory: number, totalMandatory: number, missingMandatory: string[],
    matchedOptional: number, totalOptional: number, missingOptional: string[]
  ): string {
    const parts: string[] = [];

    if (totalMandatory > 0) {
      const missingText = missingMandatory.length > 0 ? ` (Missing: ${missingMandatory.join(', ')})` : '';
      parts.push(`Mandatory skill(s): ${matchedMandatory}/${totalMandatory} Matched${missingText}`);
    }

    if (totalOptional > 0) {
      const missingText = missingOptional.length > 0 ? ` (Missing: ${missingOptional.join(', ')})` : '';
      parts.push(`Optional skill(s): ${matchedOptional}/${totalOptional} Matched${missingText}`);
    }

    return parts.join(' | ');
  }
}