const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${sessionStorage.getItem('ciq_access_token')}`,
});

export async function getConsultantProfileById(id: string): Promise<any> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/consultants/${id}`, { headers: getHeaders() });
  if (!response.ok) throw new Error("Failed to fetch by consultant ID");
  return response.json();
}

export async function getConsultantProfileByUserId(userId: string): Promise<any> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/consultants/user/${userId}`, { headers: getHeaders() });
  if (!response.ok) throw new Error("Failed to fetch by user ID");
  return response.json();
}