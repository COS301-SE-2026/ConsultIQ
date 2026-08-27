export interface FactorScoreResult {
  score: number;

  // consultant missing a required skill
  triggerHardExclusion: boolean;

  // name of mandatory skills per project
  missingMandatorySkills?: string[];

  details?: string;

  // Tracks the origin of the geographic score (or other future scorers)
  dataSource?: 'api-duration' | 'api-distance' | 'fallback' | 'remote' | 'error' | string;
}