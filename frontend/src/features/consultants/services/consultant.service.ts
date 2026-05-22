import { apiClient } from "../../../lib/api-client";

export interface CreateConsultantSkillPayload {
  skillName: string;
  competencyLevel: "BEGINNER" | "INTERMEDIATE" | "EXPERT";
  yearsExperience: number;
  confidenceLevel: number;
}

export interface CreateConsultantExperiencePayload {
  jobTitle: string;
  companyName: string;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
  workModel: "ONSITE" | "REMOTE" | "HYBRID";
  startDate: string; // ISO string
  endDate?: string;  // ISO string
  description: string;
}

export interface CreateCertificationPayload {
  title: string;
  issuingBody: string;
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
}

export interface CreateConsultantProfilePayload {
  consultantUserId: string;
  idNumber: string;
  phone: string;
  nationality: string;
  location: string;
  costToCompany: number;
  availability: "AVAILABLE" | "UNAVAILABLE" | "ON_LEAVE";
  skills: CreateConsultantSkillPayload[];
  experiences: CreateConsultantExperiencePayload[];
  certifications?: CreateCertificationPayload[];
}

export interface ConsultantListItemDto {
  id: string;
  fullName: string;
  email: string;
  location: string;
  availabilityStatus: string;
  primarySkills: string[];
  costToCompanyRate?: number;
  phone?: string | null;
  idNumber?: string | null;
  experienceYears?: number;
  certifications?: string[];
}

export interface PaginatedConsultantsResponseDto {
  page: number;
  total: number;
  consultants: ConsultantListItemDto[];
}

export interface PendingProfileUserDto {
  userId: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export const getConsultants = async (page = 1, limit = 50) => {
  return await apiClient.get<PaginatedConsultantsResponseDto>(
    `/consultants?page=${page}&limit=${limit}`
  );
};

export const getPendingProfiles = async (): Promise<PendingProfileUserDto[]> => {
  return await apiClient.get<PendingProfileUserDto[]>("/consultants/pending-profiles");
};

export const createConsultantProfile = async (
  payload: CreateConsultantProfilePayload
): Promise<{ message: string; consultantId: string }> => {
  return await apiClient.post("/consultants/profile", payload);
};