import type { ConsultantProfileDto } from "../hooks/useFetchConsultantsProfiles";

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
    phone: string;
    idNumber: string;
    nationality: string;
    location: string;
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
  }>
): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/consultants/${consultantId}`, {
    method: "PATCH",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update profile");
  }

  return response.json();
}