import { ConsultantMatchResult } from './match-result.interface';

export interface ScoringExecutionResult {
  finalResults: ConsultantMatchResult[];
  excludedCount: number;
  errorCount: number;
}