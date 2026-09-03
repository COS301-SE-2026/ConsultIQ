import { apiClient } from "../../../lib/api-client";
import type { Recommendation, MatchRunStats } from "../types/placements.types";

export interface MatchRunStatus {
    runId: string;
    status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
    progress: number;
    errorMessage?: string;
}

export interface CreatePlacementPayload{
    consultantId: string;
    startDate: string;
    endDate?: string;
    allocation: number;
}

export interface CreatePlacementResponse{
    message: string;
    placementId: string;
}

export const placementService = {
    executeMatchRun: async (projectId: string): Promise<{ runId: string; status: "IN_PROGRESS" }> => {
        return apiClient.post<{ runId: string; status: "IN_PROGRESS" }>(`/projects/${projectId}/match-run`);
    },

    getMatchRunStatus: async (projectId: string, runId: string): Promise<MatchRunStatus> => {
        return apiClient.get<MatchRunStatus>(`/projects/${projectId}/match-run/${runId}/status`);
    },

    getMatchRun: async (projectId: string, runId: string): Promise<Recommendation[]> => {
        return apiClient.get<Recommendation[]>(`/projects/${projectId}/match-run/${runId}`);
    },

    getMatchRunStats: async (projectId: string, runId: string): Promise<MatchRunStats> => {
        return apiClient.get<MatchRunStats>(`/projects/${projectId}/match-run/${runId}/stats`);
    },

    createPlacement: async (projectId: string, payload: CreatePlacementPayload): Promise<CreatePlacementResponse> =>{
        return apiClient.post<CreatePlacementResponse>(`/projects/${projectId}/placements/`, payload,);
    },
}