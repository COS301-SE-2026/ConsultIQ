/** One ranked "learn this skill" recommendation, aggregated across
 *  every pipeline project the skill was tested against. */
export interface SkillRecommendation {
  skillName: string;
  /** Projects the consultant was excluded from before, but is
   *  eligible for once this skill is added. */
  newlyEligibleProjectCount: number;
  /** Sum of score improvements across all tested projects. */
  totalScoreDelta: number;
  /** How many pipeline projects this skill was tested against. */
  projectsTested: number;
}