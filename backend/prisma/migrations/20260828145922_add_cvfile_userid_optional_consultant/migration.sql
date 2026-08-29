-- RenameIndex
ALTER INDEX "match_runs_projectId_createdAt_idx" RENAME TO "MatchRun_projectId_createdAt_idx";

-- RenameIndex
ALTER INDEX "match_runs_projectId_status_idx" RENAME TO "MatchRun_projectId_status_idx";

-- RenameIndex
ALTER INDEX "match_run_results_consultantId_idx" RENAME TO "MatchRunResult_consultantId_idx";

-- RenameIndex
ALTER INDEX "match_run_results_matchRunId_consultantId_key" RENAME TO "MatchRunResult_matchRunId_consultantId_key";

-- RenameIndex
ALTER INDEX "match_run_results_matchRunId_rank_idx" RENAME TO "MatchRunResult_matchRunId_rank_idx";
