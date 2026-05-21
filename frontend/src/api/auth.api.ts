const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface RegisterUserPayload {
  fullName: string;
  email: string;
  role: string;
}

export interface ActivateAccountPayload {
  email: string;
  token: string;
  password: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { message?: string }).message ?? 'Something went wrong.';
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function registerUser(payload: RegisterUserPayload): Promise<{ message: string; userId: string }> {
  const token = sessionStorage.getItem('ciq_access_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}



export async function activateAccount(payload: ActivateAccountPayload): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function acceptTerms(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/accept-terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}