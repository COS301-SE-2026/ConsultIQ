import { SimulationResult } from '../interfaces/simulation-result.interface';
import { SkillRecommendation } from '../interfaces/skill-recommendation.interface';

/**
 * Collapses raw per-(project, skill) simulation rows into one ranked
 * recommendation per candidate skill.
 *
 * Ranking: most newly-eligible projects first, then highest total
 * score delta, then skill name for deterministic output.
 *
 * Pure function: no DB access, no scoring, no mutation of the input.
 * Does not filter or truncate — callers decide how many to show.
 */
export function aggregateSkillRecommendations(
  results: SimulationResult[],
): SkillRecommendation[] {
  const bySkill = new Map<string, SkillRecommendation>();

  for (const result of results) {
    const existing = bySkill.get(result.candidateSkillName) ?? {
      skillName: result.candidateSkillName,
      newlyEligibleProjectCount: 0,
      totalScoreDelta: 0,
      projectsTested: 0,
    };

    existing.projectsTested += 1;
    existing.totalScoreDelta += result.scoreDelta;
    if (result.baselineExcluded && !result.projectedExcluded) {
      existing.newlyEligibleProjectCount += 1;
    }

    bySkill.set(result.candidateSkillName, existing);
  }

  return Array.from(bySkill.values()).sort(
    (a, b) =>
      b.newlyEligibleProjectCount - a.newlyEligibleProjectCount ||
      b.totalScoreDelta - a.totalScoreDelta ||
      a.skillName.localeCompare(b.skillName),
  );
}