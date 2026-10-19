import type { ConsultantProfileDto } from "../hooks/useFetchConsultantsProfiles";
import { apiClient } from "../lib/api-client";

export async function getConsultantProfileById(id: string): Promise<ConsultantProfileDto> {
  return apiClient.get<ConsultantProfileDto>(`/consultants/${id}`);
}

export async function getConsultantProfileByUserId(userId: string): Promise<ConsultantProfileDto> {
  return apiClient.get<ConsultantProfileDto>(`/consultants/user/${userId}`);
}

export async function updateConsultantProfile(
  consultantId: string,
  data: Partial<{
    fullname: string;
    email: string;
    phone: string;
    idNumber: string;
    nationality: string;
    addressLine1: string;
    addressLine2: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    costToCompany: number;
    availability: string;
    skills: { skillName: string; yearsExperience: number; confidenceLevel: number }[];
    experiences: {
      jobTitle: string;
      companyName: string;
      jobType: string;
      workModel: string;
      startDate: string;
      endDate?: string;
      description: string;
    }[];
    certifications: { title: string; issuingBody: string; startDate?: string; endDate?: string }[];
    education: {
      institution: string;
      qualification: string;
      startDate: string;
      endDate?: string;
      fileName?: string;
    }[];
  }>
): Promise<{ message: string }> {
  return apiClient.patch<{ message: string }>(`/consultants/${consultantId}`, data);
}

export async function uploadConsultantCv(
  consultantId: string,
  file: File,
): Promise<{ cvFileId: string; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post<{ cvFileId: string; message: string }>(
    `/cv/upload/${consultantId}`,
    formData,
  );
}

export async function uploadConsultantPicture(
  consultantId: string,
  file: File,
): Promise<{ pictureUrl: string; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post<{ pictureUrl: string; message: string }>(
    `/consultants/${consultantId}/picture`,
    formData,
  );
}