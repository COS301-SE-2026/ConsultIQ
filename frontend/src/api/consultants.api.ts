import type { ConsultantProfileDto } from "../hooks/useFetchConsultantsProfiles";
import { apiClient } from "../lib/api-client";
const getHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${sessionStorage.getItem('ciq_access_token')}`,
});

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";


export async function getConsultantProfileById(id: string): Promise<ConsultantProfileDto> {
  const response = await fetch(`${API_URL}/consultants/${id}`, { headers: getHeaders() });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch by consultant ID");
  }

  return response.json() as Promise<ConsultantProfileDto>;
}

export async function getConsultantProfileByUserId(userId: string): Promise<ConsultantProfileDto> {
  const response = await fetch(`${API_URL}/consultants/user/${userId}`, { headers: getHeaders() });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch by user ID");
  }

  return response.json() as Promise<ConsultantProfileDto>;
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
  return await apiClient.patch<{ message: string }>(`/consultants/${consultantId}`, data);
}

export async function uploadConsultantCv(
  consultantId: string,
  file: File,
): Promise<{ cvFileId: string; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/cv/upload/${consultantId}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload CV.');
  }

  return response.json();
}

export async function uploadConsultantPicture(
  consultantId: string,
  file: File,
): Promise<{ pictureUrl: string; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/consultants/${consultantId}/picture`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if(!response.ok){
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload profile picture.');
  }
  return response.json();
}