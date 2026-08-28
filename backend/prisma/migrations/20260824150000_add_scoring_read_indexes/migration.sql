-- Indexes for scoring candidate selection, availability, and match-run reads.
CREATE INDEX "project_placements_active_consultant_dates_idx"
ON "project_placements"("consultantId", "startDate", "endDate")
INCLUDE ("allocation")
WHERE "status" NOT IN ('TERMINATED', 'CANCELLED');

CREATE INDEX "users_status_idx"
ON "users"("status");

CREATE INDEX "match_runs_projectId_createdAt_idx"
ON "MatchRun"("projectId", "createdAt");

CREATE INDEX "match_runs_projectId_status_idx"
ON "MatchRun"("projectId", "status");

CREATE INDEX "match_run_results_matchRunId_rank_idx"
ON "MatchRunResult"("matchRunId", "rank");

CREATE INDEX "match_run_results_consultantId_idx"
ON "MatchRunResult"("consultantId");