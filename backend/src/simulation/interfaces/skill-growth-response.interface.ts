import { SkillRecommendationWithStats } from './skill-recommendation-with-stats.interface';

export interface SkillGrowthResponse {
  eligibleNow: number;
  pipelineSize: number;
  recommendations: SkillRecommendationWithStats[];
}