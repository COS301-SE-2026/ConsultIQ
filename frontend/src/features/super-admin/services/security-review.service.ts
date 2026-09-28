import { apiClient } from "../../../lib/api-client";
import type { SecurityQueueItem, SecurityHistoryItem, DashboardStats } from "../types/security-review.types";

export const securityReviewService = {
    async getQueue(): Promise<SecurityQueueItem[]> {
        return apiClient.get<SecurityQueueItem[]>("/cv/security-review-queue");
    },

    async getHistory(): Promise<SecurityHistoryItem[]> {
        return apiClient.get<SecurityHistoryItem[]>("/cv/security-review-history");
    },

    async resolve(cvFileId: string, decision: "CLEARED" | "REJECTED"): Promise<{ message: string }> {
        return apiClient.patch<{ message: string }>(`/cv/${cvFileId}/security-review`, { decision });
    },

    async getDashboardStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>("/cv/security-review-stats");
},
};