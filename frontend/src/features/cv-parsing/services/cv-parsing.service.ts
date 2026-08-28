import { apiClient } from "../../../lib/api-client";
import type { CvFileStatus, CvUploadResponse } from "../types/cv.types";

export const cvParsingService = {
    async upload(userId: string, file: File): Promise<CvUploadResponse>{
        const formData = new FormData();
        formData.append("file", file);
        return apiClient.post<CvUploadResponse>(`/cv/upload/${userId}`, formData,);
    },

    async getDownloadUrl(cvField: string): Promise<{url: string}>{
        return apiClient.get<{ url: string}>(`/cv/${cvField}/url`)
    },

    async getStatus(cvFileId: string) : Promise<CvFileStatus>{
        return apiClient.get<CvFileStatus>(`/cv/${cvFileId}/status`);
    },

};