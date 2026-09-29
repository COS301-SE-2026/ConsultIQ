import { SkillRecommendation } from './skill-recommendation.interface';

export interface SkillRecommendationWithStats extends SkillRecommendation {
  projectedEligibleCount: number;
}