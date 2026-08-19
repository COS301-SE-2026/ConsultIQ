export interface ProjectConsultantDto {
    consultantId: string;
    placementId: string;
    fullName: string;
    email: string;
    phone: string | null;
    city: string;
    primarySkills: string[];
    placementStatus: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'TERMINATED';
    allocation: number;
    startDate: Date;
    endDate: Date | null;
    costToCompany?: number;
}

export interface ProjectConsultantsResponseDto {
    projectId: string;
    totalPlacements: number;
    consultants: ProjectConsultantDto[];
}