export enum ScoringFactor {
  SKILL_ALIGNMENT = 'skillAlignment',
  COMPETENCY_MATCH = 'competencyMatch',
  COST_FIT = 'costFit',
  GEOGRAPHIC_FIT = 'geographicFit',
  AVAILABILITY = 'availability',
}

// Temporary Configurations - for Firm ware and project level configurations
export const STUB_CONSULTANCY_DEFAULT_WEIGHTS: Record<ScoringFactor, number> = {
  [ScoringFactor.SKILL_ALIGNMENT]: 40,
  [ScoringFactor.COMPETENCY_MATCH]: 30,
  [ScoringFactor.AVAILABILITY]: 15,
  [ScoringFactor.COST_FIT]: 10,
  [ScoringFactor.GEOGRAPHIC_FIT]: 5,
};

export interface SkillAlignmentDetail {
  factor: ScoringFactor.SKILL_ALIGNMENT;
  requiredSkills: number;
  possessedSkills: number;
  missingSkills: string[];
}

export interface CostFitDetail {
  factor: ScoringFactor.COST_FIT;
  consultantRate: number;
  projectBudget: number;
  withinBudget: boolean;
}

export interface CompetencyMatchDetail {
  factor: ScoringFactor.COMPETENCY_MATCH;
  perSkill: Array<{
    skill: string;
    consultantLevel: string;
    requiredLevel: string;
    score: number;
  }>;
}

export interface GeographicFitDetail {
  factor: ScoringFactor.GEOGRAPHIC_FIT;
  projectCity: string;
  consultantCity: string;
  consultantProvince: string;
  projectProvince: string;
}

export interface AvailabilityDetail {
  factor: ScoringFactor.AVAILABILITY;
  requiredAvailability: number;
  currentAvailability: number;
  withinAvailability: boolean;
}

export type ScorerDetail =
  | SkillAlignmentDetail
  | CostFitDetail
  | CompetencyMatchDetail
  | GeographicFitDetail
  | AvailabilityDetail;
