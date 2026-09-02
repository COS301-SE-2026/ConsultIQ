import { apiClient } from "../../../lib/api-client";
import type { ConsultantProfileDto } from "../../../hooks/useFetchConsultantsProfiles";

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

export interface CreateConsultantEducationPayload{
  institution: string;
  qualification : string;
  fieldStudy?: string;
  endDate?: string;
}

export interface CreateConsultantProfilePayload {
  consultantUserId: string;
  idNumber: string;
  phone: string;
  nationality: string;
  addressLine1: string;
  addressLine2?: string;
  suburb?: string;
  city: string;
  province: string;
  postalCode?: string;
  costToCompany: number;
  availability: "AVAILABLE" | "UNAVAILABLE" | "ON_LEAVE";
  skills: CreateConsultantSkillPayload[];
  experiences: CreateConsultantExperiencePayload[];
  certifications?: CreateCertificationPayload[];
  education?: CreateConsultantEducationPayload[];
}

export interface ConsultantListItemDto {
  id: string;
  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  suburb?: string;
  city: string;
  province: string;
  postalCode?: string;
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

export interface AssignedProjectSummary {
  id: string;
  projectName: string;
  clientName: string;
  description: string | null;
  addressLine1: string;
  suburb: string | null;
  city: string;
  province: string;
  postalCode: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "ARCHIVED" | "COMPLETED";
  startDate: string;
  endDate: string | null;
  allocation: number;
  teamSize: number;
}

export interface AssignedProjectListItem {
  placementId: string;
  placementStatus: "ACTIVE" | "COMPLETED" | "CANCELLED" | "TERMINATED";
  placementAllocation: number;
  startDate: string;
  endDate: string | null;
  project: AssignedProjectSummary;
}

export interface AssignedProjectSkill {
  skillName: string;
  competency: string;
  years: number;
  mandatory: boolean;
}

export interface AssignedProjectTeamMember {
  fullName: string;
  email: string;
}

export interface AssignedProjectDetail {
  id: string;
  projectName: string;
  clientName: string;
  description: string | null;
  addressLine1: string;
  addressLine2: string | null;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "ARCHIVED" | "COMPLETED";
  startDate: string;
  endDate: string | null;
  teamSize: number;
  allocation: number;
  budget: number;
  skills: AssignedProjectSkill[];
  teamMembers: AssignedProjectTeamMember[];
}

export interface AssignedProjectDetailDto {
  placementId: string;
  placementStatus: string;
  placementAllocation: number;
  startDate: string;
  endDate: string | null;
  project: AssignedProjectDetail;
}

export const getAssignedProjects = async (): Promise<AssignedProjectListItem[]> => {
  return await apiClient.get<AssignedProjectListItem[]>(
    "/consultants/assigned/project"
  );
};

export const getAssignedProjectDetails = async ( projectId: string ): Promise<AssignedProjectDetailDto> => {
  return await apiClient.get<AssignedProjectDetailDto>(
    `/consultants/assigned/projects/${projectId}`
  );
};

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

export const  getConsultantProfileById = async (id: string): Promise<ConsultantProfileDto>  => {
  return await apiClient.get<ConsultantProfileDto>(`/consultants/${id}`);

}

export const getConsultantProfileByUserId = async (userId: string): Promise<ConsultantProfileDto> => {
  return await apiClient.get<ConsultantProfileDto>(`/consultants/user/${userId}`);

}