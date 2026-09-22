import http from 'k6/http';
import { check } from 'k6';

let currentCsrfToken = null;

export function syncCsrfFromResponse(res) {
    if (!res || !res.cookies || !res.cookies['XSRF-TOKEN']) return null;

    const csrfCookie = res.cookies['XSRF-TOKEN'];
    const token = Array.isArray(csrfCookie) ? csrfCookie[0]?.value : csrfCookie.value;

    if (token) {
        currentCsrfToken = token;
    }
    return token || null;
}

export function getCsrfToken() {
    if (currentCsrfToken) return currentCsrfToken;

    const cookies = http.cookieJar().cookiesForURL(__ENV.TARGET_URL || 'http://localhost:3000');
    const jarEntries = Array.isArray(cookies) ? cookies : Object.values(cookies || {});

    for (let i = 0; i < jarEntries.length; i++) {
        const cookie = jarEntries[i];
        const name = cookie && (cookie.name || cookie.key || cookie[0]?.name);
        if (name === 'XSRF-TOKEN') {
            const value = cookie && (cookie.value || cookie[0]?.value);
            if (value) {
                currentCsrfToken = value;
                return value;
            }
        }
    }
    return null;
}

export function withCsrfHeader(baseUrl, options = {}) {
    const requestOptions = { ...options };
    const headers = { ...(requestOptions.headers || {}) };
    const csrfToken = getCsrfToken();

    if (csrfToken && !headers['X-CSRF-Token'] && !headers['x-csrf-token']) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    requestOptions.headers = headers;
    return requestOptions;
}

export function login(baseUrl, user) {
    const res = http.post(`${baseUrl}/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password,
    }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'auth_login' },
    });

    syncCsrfFromResponse(res);

    check(res, {
        'login successful': (r) => r.status === 200 || r.status === 201,
        'csrf cookie established': () => !!getCsrfToken(),
    });
    return res;
}