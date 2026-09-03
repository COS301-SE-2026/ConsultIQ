import { apiClient } from "../../../lib/api-client";
import type { CvFileStatus, CvUploadResponse } from "../types/cv.types";

export const cvParsingService = {
    async upload(userId: string, file: File, parsingMethod: "RULE_BASED" | "AI_ASSISTED" = "RULE_BASED"): Promise<CvUploadResponse>{
        const formData = new FormData();
        formData.append("file", file);
        formData.append("parsingMethod", parsingMethod);
        return apiClient.post<CvUploadResponse>(`/cv/upload/${userId}`, formData,);
    },

    async getDownloadUrl(cvField: string): Promise<{url: string}>{
        return apiClient.get<{ url: string}>(`/cv/${cvField}/url`)
    },

    async getCvFile(cvFileId: string) : Promise<CvFileStatus>{
        return apiClient.get<CvFileStatus>(`/cv/${cvFileId}`);
    },

    async discard(cvFileId: string) : Promise<{ message : string}>{
        return apiClient.delete<{message: string}>(`/cv/${cvFileId}`);
    },

};