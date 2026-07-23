import { apiClient } from "../../../lib/api-client";
import type { Recommendation, MatchRunStats } from "../types/placements.types";

export const placementService = {
    executeMatchRun: async (projectId: string): Promise<Recommendation[]> => {
        return apiClient.post<Recommendation[]>(`/projects/${projectId}/match-run`);
    },

    getMatchRun: async (projectId: string, runId: string): Promise<Recommendation[]> => {
        return apiClient.get<Recommendation[]>(`/projects/${projectId}/match-run/${runId}`);
    },

    getMatchRunStats: async (projectId: string, runId: string): Promise<MatchRunStats> => {
        return apiClient.get<MatchRunStats>(`/projects/${projectId}/match-run/${runId}/stats`);
    }
}