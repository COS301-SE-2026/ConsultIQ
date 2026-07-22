import { ScorerDetail } from '../../enums/scoring-factor.enum';

export interface FactorScoreResult {
  score: number;

  //consultant missing a required skill
  triggerHardExclusion: boolean;

  //name of mandatory skills per project
  missingMandatorySkills?: string[];

  detail?: ScorerDetail;
}
