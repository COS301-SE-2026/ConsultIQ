import { SkillRecommendation } from '../interfaces/skill-recommendation.interface';

export const MAX_SKILL_RECOMMENDATIONS = 3;

/**
 * Takes the aggregator's ALREADY-RANKED output, drops skills that
 * would not actually help (nothing unlocked and no score gain), and
 * caps the list. Recommending a skill that changes nothing would be
 * worse than recommending nothing.
 *
 * Returns an empty array when no skill helps — a valid outcome
 * meaning the consultant is already well positioned for the pipeline.
 */
export function selectTopSkillRecommendations(
  ranked: SkillRecommendation[],
  limit: number = MAX_SKILL_RECOMMENDATIONS,
): SkillRecommendation[] {
  return ranked
    .filter((r) => r.newlyEligibleProjectCount > 0 || r.totalScoreDelta > 0)
    .slice(0, limit);
}