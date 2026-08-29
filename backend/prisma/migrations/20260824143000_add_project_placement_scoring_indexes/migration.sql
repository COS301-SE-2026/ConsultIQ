-- Supporting indexes for batched match-run availability and placement lookups.
CREATE INDEX "project_placements_consultantId_status_startDate_endDate_idx"
ON "project_placements"("consultantId", "status", "startDate", "endDate");

CREATE INDEX "project_placements_projectId_consultantId_status_idx"
ON "project_placements"("projectId", "consultantId", "status");