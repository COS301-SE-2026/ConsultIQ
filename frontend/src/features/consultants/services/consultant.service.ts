import { apiClient } from "../../../lib/api-client";

export interface CreateConsultantPayload {
    name: string;
    surname: string;
    idNumber?: string;
    phoneNumber?: string;
    email: string;
    location: string;
    availability: boolean;
    skills: {
        skillName: string;
        experience: string;
        competencyLevel: string;
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