const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error{
    status: number;
    constructor(message:string, status: number){
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = sessionStorage.getItem('ciq_access_token');

    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });


    if (response.status === 204) return {} as T;


    let responseData: Record<string, unknown> | null = null;
    try {
        responseData = await response.json();
    } catch {
        // If parsing fails
    }


    if (!response.ok) {
        if (response.status === 401) {
            sessionStorage.removeItem('ciq_access_token');
            sessionStorage.removeItem('ciq_refresh_token');
           const isAlreadyOnLoginPage = window.location.pathname.startsWith('/login');

            if (!isAlreadyOnLoginPage) {
                window.location.href = '/login';
            }
        }

        let errorMessage = `Request failed (${response.status})`;


        if (responseData && responseData.message) {
            const msg = responseData.message;
            errorMessage = Array.isArray(msg) ? msg.join(', ') : String(msg);
        }


        throw new ApiError(errorMessage,response.status);
    }


    return responseData as T;
}

export const apiClient = {
    get: <T>(endpoint: string, options?: RequestInit) => fetchWithAuth<T>(endpoint, { ...options, method: 'GET' }),
    post: <T>(endpoint: string, data?: unknown, options?: RequestInit) => fetchWithAuth<T>(endpoint, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }),
    put: <T>(endpoint: string, data?: unknown, options?: RequestInit) => fetchWithAuth<T>(endpoint, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
    patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) => fetchWithAuth<T>(endpoint, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
    delete: <T>(endpoint: string, options?: RequestInit) => fetchWithAuth<T>(endpoint, { ...options, method: 'DELETE' }),
};