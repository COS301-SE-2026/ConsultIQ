import { ScoringFactor } from '../enums/scoring-factor.enum';

// Stub for active/inative factors and hard exclusion settings

export interface FactorActivationConfig {
  isActive: Record<ScoringFactor, boolean>;
  hardExclusion: boolean;
}

export const STUB_FACTOR_ACTIVATION_CONFIG: FactorActivationConfig = {
  isActive: {
    [ScoringFactor.SKILL_ALIGNMENT]: true,
    [ScoringFactor.COMPETENCY_MATCH]: true,
    [ScoringFactor.COST_FIT]: true,
    [ScoringFactor.GEOGRAPHIC_FIT]: true,
    [ScoringFactor.AVAILABILITY]: true,
  },
  hardExclusion: false,
};
