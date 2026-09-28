import type { CvSecurityFlag } from "../../cv-parsing/types/cv.types";

export interface SecurityQueueItem {
    cvFileId: string;
    fileName: string;
    uploadedAt: string;
    consultantUserId: string;
    consultantName: string;
    consultantEmail: string;
    securityFlags: CvSecurityFlag[];
}

export interface SecurityHistoryItem {
    cvFileId: string;
    fileName: string;
    consultantName: string;
    decision: "CLEARED" | "REJECTED";
    reviewedAt: string;
    reviewedByName: string;
}

export interface DashboardStats {
    totalProcessed: number;
    flagRatePercent: number;
    avgResolutionHours: number | null;
}