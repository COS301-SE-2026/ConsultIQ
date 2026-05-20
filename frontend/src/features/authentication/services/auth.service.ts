import type { LoginPayload, LoginResult } from '../types/auth.types';
import { apiClient } from '../../../lib/api-client';

const API_BASE_URL = 'http://localhost:3000';


export class ApiError extends Error {
    public readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}

async function handleResponse<T>(res: Response): Promise<T> {
    if (res.ok) return res.json() as Promise<T>;

    let message = `Request failed (${res.status})`;
    try {
        const body = await res.json();

        if (Array.isArray(body?.message)) {
            message = body.message.join(', ');
        } else if (typeof body?.message === 'string') {
            message = body.message;
        }
    } catch {
        // ignore parse errors 
    }

    throw new ApiError(res.status, message);
}

export const authService = {
    login: (payload: LoginPayload): Promise<LoginResult> =>
        fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        }).then((res) => handleResponse<LoginResult>(res)),
    getProfile: async (): Promise<Omit<LoginResult, 'accessToken' | 'refreshToken'>> => {
        // Hits your /auth/me endpoint 
        const response = await apiClient.get<{ result: Omit<LoginResult, 'accessToken' | 'refreshToken'> }>('/auth/me');
        return response.result;
    }
};
