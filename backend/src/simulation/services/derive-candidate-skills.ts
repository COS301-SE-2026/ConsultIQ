import { CompetencyLevel } from '@prisma/client';
import { RawConsultantDto } from '../../scoring/dto/raw-consultant.dto';
import { HypotheticalSkillInput } from '../interfaces/simulation-result.interface';
import { PipelineProject } from '../interfaces/candidates-skills.interface';

/**
 * Derives the set of candidate skills worth simulating for a consultant:
 * every MANDATORY skill required somewhere in the active pipeline that
 * the consultant does not already have, each paired with the most
 * commonly-requested competency level for that skill across the
 * pipeline (mode). Optional/nice-to-have skills are excluded — they
 * don't block eligibility, so testing them wouldn't answer "what
 * would actually help me get placed."
 *
 * Pure function: no DB access, no scoring, fully deterministic given
 * the same inputs. Returns an empty array if the consultant already
 * has every mandatory skill the pipeline asks for.
 */
export function deriveCandidateSkills(
  consultantSkills: RawConsultantDto['skills'],
  pipelineProjects: PipelineProject[],
): HypotheticalSkillInput[] {
  const ownedSkillNames = new Set(
    consultantSkills.map((s) => s.skillName.trim().toLowerCase()),
  );

  // skillName (normalised) -> list of competency levels requested for it
  // across every pipeline project that requires it mandatorily.
  const requestedLevelsBySkill = new Map<string, CompetencyLevel[]>();
  // normalised name -> original, display-correct casing (first one seen)
  const displayNameBySkill = new Map<string, string>();

  for (const project of pipelineProjects) {
    for (const requiredSkill of project.skills) {
      if (!requiredSkill.mandatory) continue;

      const normalised = requiredSkill.skill.name.trim().toLowerCase();
      if (ownedSkillNames.has(normalised)) continue; // consultant already has it

      if (!displayNameBySkill.has(normalised)) {
        displayNameBySkill.set(normalised, requiredSkill.skill.name);
      }

      const levels = requestedLevelsBySkill.get(normalised) ?? [];
      levels.push(requiredSkill.competency);
      requestedLevelsBySkill.set(normalised, levels);
    }
  }

  return Array.from(requestedLevelsBySkill.entries()).map(
    ([normalised, levels]) => ({
      skillName: displayNameBySkill.get(normalised)!,
      competencyLevel: mostCommonLevel(levels),
    }),
  );
}

/** Mode of the given levels; ties broken by whichever level appears
 *  first in the input order, for deterministic output. */
function mostCommonLevel(levels: CompetencyLevel[]): CompetencyLevel {
  const counts = new Map<CompetencyLevel, number>();
  for (const level of levels) {
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }

  let best = levels[0];
  let bestCount = 0;
  for (const [level, count] of counts) {
    if (count > bestCount) {
      best = level;
      bestCount = count;
    }
  }
  return best;
}