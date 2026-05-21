import { apiClient } from "../../../lib/api-client";

export interface CreateConsultantPayload {
    name: string;
    surname: string;
    idNumber?: string;
    phoneNumber?: string;
    email: string;
    location: string;
    availability: boolean;
    costToCompany: number;
    skills: {
        skillName: string;
        experience: string;
        competencyLevel: string;
    }[];
    experiences?: {
        jobTitle: string;
        companyName: string;
        jobType: string;
        workModel: string;
        startDate: string;
        endDate?: string;
        description: string;
    }[];
    certifications: {
        title: string;
    }[];
}

export interface ConsultantListItemDto {
    id: string;
    fullName: string;
    email: string;
    location: string;
    availabilityStatus: string;
    primarySkills: string[];
    costToCompanyRate?: number;
    phone?: string;
    idNumber?: string;
    experienceYears?: number;
    certifications?: string[];
}

export interface PaginatedConsultantsResponseDto {
    page: number;
    total: number;
    consultants: ConsultantListItemDto[];
}

export const getConsultants = async (page: number = 1, limit: number = 50) => {
    return await apiClient.get<PaginatedConsultantsResponseDto>(`/consultants?page=${page}&limit=${limit}`);
};

export const createConsultant = async (payload: CreateConsultantPayload) => {
    const response = await apiClient.post("/consultants", payload);
    return response;
};