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