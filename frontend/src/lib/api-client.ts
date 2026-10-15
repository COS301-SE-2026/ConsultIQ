import { API_BASE_URL } from '../api/api-base-url';

const CSRF_TOKEN_KEY = 'ciq_csrf_token';

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

let csrfTokenMemory: string | null = null;
let csrfTokenRefreshPromise: Promise<string> | null = null;

const readCsrfTokenCookie = (): string | null => {
    if (typeof document === 'undefined') {
        return null;
    }

    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='));

    if (!match) return null;
    return decodeURIComponent(match.slice('XSRF-TOKEN='.length));
};

const readSharedCsrfToken = (): string | null => {
    try {
        return typeof localStorage === 'undefined'
            ? null
            : localStorage.getItem(CSRF_TOKEN_KEY);
    } catch {
        return null;
    }
};

const rememberCsrfToken = (token: string): void => {
    csrfTokenMemory = token;
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(CSRF_TOKEN_KEY, token);
        }
    } catch {
        // The in-memory token remains available when browser storage is blocked.
    }
};

const withBrowserLock = <T>(name: string, action: () => Promise<T>): Promise<T> => {
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
        return navigator.locks.request(name, action);
    }
    return action();
};

const fetchCsrfToken = async (
    forceRefresh: boolean,
    rejectedToken?: string,
): Promise<string> => {
    return withBrowserLock('ciq-csrf-token', async () => {
        const cookieToken = readCsrfTokenCookie();
        const sharedToken = readSharedCsrfToken();
        const candidates = [cookieToken, sharedToken, csrfTokenMemory].filter(
            (token): token is string => Boolean(token),
        );
        const currentToken = forceRefresh
            ? candidates.find((token) => token !== rejectedToken) ?? candidates[0]
            : candidates[0];

        if (!forceRefresh && currentToken) {
            rememberCsrfToken(currentToken);
            return currentToken;
        }

        if (
            forceRefresh &&
            rejectedToken &&
            currentToken &&
            currentToken !== rejectedToken
        ) {
            rememberCsrfToken(currentToken);
            return currentToken;
        }

        const url = forceRefresh
            ? `${API_BASE_URL}/auth/csrf-token?refresh=true`
            : `${API_BASE_URL}/auth/csrf-token`;
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
            throw new ApiError('Unable to renew the security token. Please retry.', response.status);
        }

        const data = await response.json() as { csrfToken?: string };
        if (typeof data.csrfToken !== 'string' || data.csrfToken.length === 0) {
            throw new ApiError('The server returned an invalid security token.', response.status);
        }

        const latestCookieToken = readCsrfTokenCookie();
        const token = latestCookieToken ?? data.csrfToken;
        rememberCsrfToken(token);
        return token;
    });
};

const getCsrfToken = async (forceRefresh = false, rejectedToken?: string): Promise<string> => {
    const cookieToken = readCsrfTokenCookie();
    const sharedToken = readSharedCsrfToken();
    const currentToken = cookieToken ?? sharedToken ?? csrfTokenMemory;

    if (!forceRefresh && currentToken) {
        rememberCsrfToken(currentToken);
        return currentToken;
    }

    if (csrfTokenRefreshPromise) return csrfTokenRefreshPromise;

    const refreshPromise = fetchCsrfToken(forceRefresh, rejectedToken);
    csrfTokenRefreshPromise = refreshPromise;
    try {
        return await refreshPromise;
    } finally {
        if (csrfTokenRefreshPromise === refreshPromise) {
            csrfTokenRefreshPromise = null;
        }
    }
};

let refreshTokenFn: () => Promise<string | null> = async () => {
    throw new Error('Refresh function not injected yet');
};

const isCsrfFailure = (responseData: Record<string, unknown> | null): boolean =>
    typeof responseData?.message === 'string' &&
    responseData.message.toLowerCase().includes('csrf');

let logoutFn: () => void = () => {
    if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
    }
};
let isLoggingOut = false;

export const setLoggingOut = (loggingOut: boolean) => {
    isLoggingOut = loggingOut;
};

export const clearCsrfToken = (): void => {
    csrfTokenMemory = null;
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(CSRF_TOKEN_KEY);
        }
    } catch {
        // The in-memory token remains available when browser storage is blocked.
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

let accessTokenRefreshPromise: Promise<void> | null = null;

const refreshAccessToken = (): Promise<void> => {
    if (!accessTokenRefreshPromise) {
        const refreshPromise = withBrowserLock('ciq-refresh-token', async () => {
            if (isLoggingOut) return;
            const token = await refreshTokenFn();
            if (!token) throw new Error('Refresh token was rejected');
        });
        accessTokenRefreshPromise = refreshPromise;
        void refreshPromise.finally(() => {
            if (accessTokenRefreshPromise === refreshPromise) {
                accessTokenRefreshPromise = null;
            }
        }).catch(() => undefined);
    }
    return accessTokenRefreshPromise;
};

async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {},
    accessRecoveryAttempted = false,
    csrfRecoveryAttempted = false,
    csrfTokenOverride?: string,
): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const method = (options.method ?? 'GET').toUpperCase();
    const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const csrfToken = isUnsafeMethod
        ? csrfTokenOverride ?? await getCsrfToken()
        : null;
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    if (response.status === 204) return {} as T;

    let responseData: Record<string, unknown> | null = null;
    try {
        responseData = await response.json();
    } catch {
        // Non-JSON error responses are reported using their HTTP status below.
    }

    if (response.status === 401 && !accessRecoveryAttempted) {
        if (isLoggingOut) return waitForLogout<T>();

        try {
            await refreshAccessToken();
        } catch {
            if (isLoggingOut) return waitForLogout<T>();
            if (!window.location.pathname.startsWith('/login')) logoutFn();
            throw new ApiError('Your session has expired. Please sign in again.', 401);
        }

        if (isLoggingOut) return waitForLogout<T>();
        return fetchWithAuth<T>(
            endpoint,
            options,
            true,
            csrfRecoveryAttempted,
            csrfTokenOverride,
        );
    }

    if (
        response.status === 403 &&
        isCsrfFailure(responseData) &&
        !csrfRecoveryAttempted
    ) {
        if (isLoggingOut) return waitForLogout<T>();

        const replacementToken = await getCsrfToken(true, csrfToken ?? undefined);
        if (isLoggingOut) return waitForLogout<T>();
        return fetchWithAuth<T>(
            endpoint,
            options,
            accessRecoveryAttempted,
            true,
            replacementToken,
        );
    }

    if (!response.ok) {
        let errorMessage = `Request failed (${response.status})`;
        if (responseData?.message) {
            const message = responseData.message;
            errorMessage = Array.isArray(message) ? message.join(', ') : String(message);
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