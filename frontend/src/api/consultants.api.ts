const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${sessionStorage.getItem('ciq_access_token')}`,
});

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function getConsultantProfileById(id: string): Promise<any> {
  const response = await fetch(`${API_URL}/consultants/${id}`, { headers: getHeaders() });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch by consultant ID");
  }

  return response.json();
}

export async function getConsultantProfileByUserId(userId: string): Promise<any> {
  const response = await fetch(`${API_URL}/consultants/user/${userId}`, { headers: getHeaders() });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch by user ID");
  }

  return response.json();
}