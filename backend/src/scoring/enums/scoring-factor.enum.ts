export enum ScoringFactor {
  SKILL_ALIGNMENT = 'SKILL_ALIGNMENT',
  COMPETENCY_LEVEL = 'COMPETENCY_LEVEL',
  COST_TO_COMPANY = 'COST_TO_COMPANY',
  LOCATION = 'LOCATION',
  AVAILABILITY = 'AVAILABILITY',
}

export interface SkillAlignmentDetail {
  factor: ScoringFactor.SKILL_ALIGNMENT;
  requiredSkills: number;
  possessedSkills: number;
  missingSkills: string[];
}

export interface CostFitDetail {
  factor: ScoringFactor.COST_TO_COMPANY;
  consultantRate: number;
  projectBudget: number;
  withinBudget: boolean;
}

export interface CompetencyMatchDetail {
  factor: ScoringFactor.COMPETENCY_LEVEL;
  perSkill: Array<{
    skill: string;
    consultantLevel: string;
    requiredLevel: string;
    score: number;
  }>;
}

export interface GeographicFitDetail {
  factor: ScoringFactor.LOCATION;
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
