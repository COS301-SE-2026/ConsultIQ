import { CompetencyLevel } from '@prisma/client';
import { ConsultantSkillEntry } from '../interfaces/consultant-skill-entry.interface';
import { ProjectSkillRequirement } from '../interfaces/project-skill-requirement.interface';
import { TeamSkillDemandItem } from '../interfaces/team-skill-demand-item.interface';
import { TeamConsultant } from '../interfaces/team-consultant.interface';
import { ConsultantSummary } from '../interfaces/consultant-summary.interface';

const COMPETENCY_ORDER: CompetencyLevel[] = [
  CompetencyLevel.BEGINNER,
  CompetencyLevel.INTERMEDIATE,
  CompetencyLevel.EXPERT,
];

function levelsAtOrAbove(floor: CompetencyLevel): CompetencyLevel[] {
  const floorIndex = COMPETENCY_ORDER.indexOf(floor);
  return floorIndex === -1 ? [floor] : COMPETENCY_ORDER.slice(floorIndex);
}

function toSummary(consultant: TeamConsultant): ConsultantSummary {
  return {
    consultantId: consultant.consultantId,
    fullName: consultant.fullName,
    email: consultant.email,
  };
}

/**
 * For one CM's team, computes per-skill demand across the active
 * pipeline: who has the skill (supply, named), who would need
 * training (trainingGap, named), and how many active projects
 * requiring the skill have NO team member meeting its required
 * competency level (uncoveredProjectCount).
 *
 * Scoped to skills MANDATORILY required somewhere in the active
 * pipeline. Checks skill-competency coverage only — no budget,
 * location, or availability exclusions.
 *
 * Pure function: no DB access, no mutation, fully deterministic.
 */
export function computeTeamSkillDemand(
  team: TeamConsultant[],
  consultantSkills: ConsultantSkillEntry[],
  projectRequirements: ProjectSkillRequirement[],
): TeamSkillDemandItem[] {
  const mandatoryReqs = projectRequirements.filter((r) => r.mandatory);

  const reqsBySkill = new Map<string, ProjectSkillRequirement[]>();
  for (const req of mandatoryReqs) {
    const existing = reqsBySkill.get(req.skillId) ?? [];
    existing.push(req);
    reqsBySkill.set(req.skillId, existing);
  }

  const items: TeamSkillDemandItem[] = Array.from(reqsBySkill.entries()).map(
    ([skillId, reqs]) => {
      const skillName = reqs[0].skillName;

      const consultantIdsWithSkill = new Set(
        consultantSkills.filter((cs) => cs.skillId === skillId).map((cs) => cs.consultantId),
      );

      const consultantsWithSkill = team
        .filter((c) => consultantIdsWithSkill.has(c.consultantId))
        .map(toSummary);
      const consultantsNeedingTraining = team
        .filter((c) => !consultantIdsWithSkill.has(c.consultantId))
        .map(toSummary);

      const uncoveredProjectCount = reqs.filter((req) => {
        const acceptableLevels = levelsAtOrAbove(req.competency);
        const isCovered = consultantSkills.some(
          (cs) => cs.skillId === skillId && acceptableLevels.includes(cs.competencyLevel),
        );
        return !isCovered;
      }).length;

      return {
        skillName,
        supply: consultantsWithSkill.length,
        trainingGap: consultantsNeedingTraining.length,
        projectsRequiringSkill: reqs.length,
        uncoveredProjectCount,
        consultantsWithSkill,
        consultantsNeedingTraining,
      };
    },
  );

  return items.sort(
    (a, b) =>
      b.uncoveredProjectCount - a.uncoveredProjectCount ||
      b.trainingGap - a.trainingGap ||
      a.skillName.localeCompare(b.skillName),
  );
}