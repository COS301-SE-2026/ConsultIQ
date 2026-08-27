ALTER TABLE "MatchRunResult"
ADD CONSTRAINT "match_run_results_matchRunId_consultantId_key"
UNIQUE ("matchRunId", "consultantId");