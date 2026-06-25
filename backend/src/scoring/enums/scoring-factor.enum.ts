
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