import { SkillRecommendation } from './skill-recommendation.interface';

/** What the consultant-facing endpoint returns. Wrapped in an object
 *  so fields can be added later without breaking the frontend contract.
 *  Deliberately contains no project ids or project details. */
export interface SkillGrowthResponse {
  recommendations: SkillRecommendation[];
}