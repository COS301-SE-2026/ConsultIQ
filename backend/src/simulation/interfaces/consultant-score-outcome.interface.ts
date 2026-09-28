/** Result of scoring one consultant DTO (real or hypothetical)
 *  against one project's resolved scoring context. */
export interface ConsultantScoreOutcome {
  score: number;
  excluded: boolean;
}