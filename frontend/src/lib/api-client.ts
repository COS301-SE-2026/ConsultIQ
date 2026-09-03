const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

let refreshTokenFn: () => Promise<string | null> = async () => {
    throw new Error("Refresh function not injected yet");
};

let logoutFn: () => void = () => {
    if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
    }
};
let isLoggingOut = false;

export const setLoggingOut = (loggingOut: boolean) => {
    isLoggingOut = loggingOut;
    if (loggingOut) {
        failedQueue = [];
    }
};

const waitForLogout = <T>(): Promise<T> => new Promise(() => undefined);

export const injectAuth = ({
    refreshToken,
    logout,
}: {
    refreshToken: () => Promise<string | null>;
    logout: () => void;
}) => {
    refreshTokenFn = refreshToken;
    logoutFn = logout;
};

// Refresh Queue Logic
let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = [];

const processQueue = (error: unknown = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(null);
        }
    });
    failedQueue = [];
};


async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
    });

    if (response.status === 204) return {} as T;

    // (Token Expiration)
    if (response.status === 401) {
        if (isLoggingOut) {
            return waitForLogout<T>();
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(() => {
                if (isLoggingOut) {
                    return waitForLogout<T>();
                }
                return fetchWithAuth<T>(endpoint, options);
            });
        }

        isRefreshing = true;

        try {
            if (isLoggingOut) {
                return waitForLogout<T>();
            }

            if (typeof navigator !== 'undefined' && 'locks' in navigator) {
                await navigator.locks.request('ciq-refresh-token', async () => {
                    if (isLoggingOut) {
                        return;
                    }
                    const lastRefresh = parseInt(localStorage.getItem('lastRefreshTime') || '0', 10);
                    if (Date.now() - lastRefresh < 5000) return;

                    await refreshTokenFn();
                    localStorage.setItem('lastRefreshTime', Date.now().toString());
                });
            } else {
                await refreshTokenFn();
            }

            if (isLoggingOut) {
                return waitForLogout<T>();
            }

            processQueue(null);

            return fetchWithAuth<T>(endpoint, options);

        } catch (err) {
            processQueue(err);

            if (isLoggingOut) {
                return waitForLogout<T>();
            }

            const isAlreadyOnLoginPage = window.location.pathname.startsWith('/login');
            if (!isLoggingOut && !isAlreadyOnLoginPage) {
                logoutFn();
            }
            throw new ApiError('Session expired', 401);
        } finally {
            isRefreshing = false;
        }
    }

    let responseData: Record<string, unknown> | null = null;
    try {
        responseData = await response.json();
    } catch {
        // If parsing fails
    }


    if (!response.ok) {
        let errorMessage = `Request failed (${response.status})`;
        if (responseData && responseData.message) {
            const msg = responseData.message;
            errorMessage = Array.isArray(msg) ? msg.join(', ') : String(msg);
        }
        throw new ApiError(errorMessage, response.status);
    }

    return responseData as T;
}

export const apiClient = {
    get: <T>(endpoint: string, options?: RequestInit) => fetchWithAuth<T>(endpoint, { ...options, method: 'GET' }),
    post: <T>(endpoint: string, data?: unknown, options?: RequestInit) => fetchWithAuth<T>(endpoint, { ...options, method: 'POST', body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined }),
    put: <T>(endpoint: string, data?: unknown, options?: RequestInit) => fetchWithAuth<T>(endpoint, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
    patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) => fetchWithAuth<T>(endpoint, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
    delete: <T>(endpoint: string, options?: RequestInit) => fetchWithAuth<T>(endpoint, { ...options, method: 'DELETE' }),
};