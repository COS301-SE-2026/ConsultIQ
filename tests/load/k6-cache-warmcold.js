import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate } from 'k6/metrics';

const users = new SharedArray('users', function () {
    return JSON.parse(open('./test-users.json'));
});

const CACHE_HEADER_NAME = __ENV.CACHE_HEADER_NAME || null;
const WARM_READ_COUNT = Number(__ENV.WARM_READ_COUNT || 10);

const coldReadLatency = new Trend('cache_cold_read_latency', true);
const warmReadLatency = new Trend('cache_warm_read_latency', true);
const postInvalidationLatency = new Trend('cache_post_invalidation_latency', true);
const invalidationCorrect = new Rate('cache_invalidation_correct');
const cacheHeaderMatchesExpectation = new Rate('cache_header_matches_expectation');


const listColdReadLatency = new Trend('cache_list_cold_read_latency', true);
const listWarmReadLatency = new Trend('cache_list_warm_read_latency', true);

export const options = {
    scenarios: {
        cache_probe: {
            executor: 'shared-iterations',
            exec: 'probe',
            vus: 1,
            iterations: 1,
            maxDuration: '2m',
        },
    },
    thresholds: {

        cache_invalidation_correct: ['rate>0.99'],
    },
};

// let currentCsrfToken = null;

// function syncCsrfFromResponse(res) {
//     if (!res || !res.cookies || !res.cookies['XSRF-TOKEN']) return null;

//     const csrfCookie = res.cookies['XSRF-TOKEN'];
//     const token = Array.isArray(csrfCookie) ? csrfCookie[0]?.value : csrfCookie.value;

//     if (token) {
//         currentCsrfToken = token;
//     }

//     return token || null;
// }

// function getCsrfToken() {
//     if (currentCsrfToken) return currentCsrfToken;

//     const cookies = http.cookieJar().cookiesForURL(__ENV.TARGET_URL || 'http://localhost:3000');
//     const jarEntries = Array.isArray(cookies) ? cookies : Object.values(cookies || {});

//     for (let i = 0; i < jarEntries.length; i++) {
//         const cookie = jarEntries[i];
//         const name = cookie && (cookie.name || cookie.key || cookie[0]?.name);
//         if (name === 'XSRF-TOKEN') {
//             const value = cookie && (cookie.value || cookie[0]?.value);
//             if (value) {
//                 currentCsrfToken = value;
//                 return value;
//             }
//         }
//     }

//     return null;
// }

// function withCsrfHeader(baseUrl, options = {}) {
//     const requestOptions = { ...options };
//     const headers = { ...(requestOptions.headers || {}) };
//     const csrfToken = getCsrfToken();

//     if (csrfToken && !headers['X-CSRF-Token'] && !headers['x-csrf-token']) {
//         headers['X-CSRF-Token'] = csrfToken;
//     }

//     requestOptions.headers = headers;
//     return requestOptions;
// }

// function login(baseUrl, user) {
//     const res = http.post(`${baseUrl}/auth/login`, JSON.stringify({
//         email: user.email,
//         password: user.password,
//     }), {
//         headers: { 'Content-Type': 'application/json' },
//         tags: { endpoint: 'auth_login' },
//     });

//     syncCsrfFromResponse(res);

//     check(res, {
//         'login successful': (r) => r.status === 200 || r.status === 201,
//         'csrf cookie established': () => !!getCsrfToken(),
//     });
//     return res;
// }

function pickProjectManager() {
    const candidates = users.filter((u) => u.role === 'ADMIN' || u.role === 'PROJECT_MANAGER');
    if (candidates.length === 0) {
        throw new Error('[FATAL] No ADMIN or PROJECT_MANAGER users found in test-users.json');
    }
    const randomIndex = randomInt(0, candidates.length);
    return candidates[randomIndex];
}

function checkCacheHeader(res, expected) {
    if (!CACHE_HEADER_NAME) return;
    const actual = res.headers[CACHE_HEADER_NAME] || res.headers[CACHE_HEADER_NAME.toLowerCase()];
    cacheHeaderMatchesExpectation.add(actual === expected);
    if (actual !== expected) {
        console.log(`[WARNING] Expected ${CACHE_HEADER_NAME}=${expected}, got ${actual}`);
    }
}

export function probe() {
    const baseUrl = __ENV.TARGET_URL || 'http://localhost:3000';
    const user = pickProjectManager();

    login(baseUrl, user);

    // --- Get a real project ID  ---
    const listRes = http.get(`${baseUrl}/projects`, { tags: { endpoint: 'projects_list' } });
    check(listRes, { 'project list loaded': (r) => r.status === 200 });
    let projectId;
    try {
        const projects = listRes.json().projects;
        projectId = Array.isArray(projects) && projects.length > 0 ? projects[0].id : undefined;
    } catch (e) {
        console.log(`[FATAL] Could not parse project list: ${e.message}`);
    }
    if (!projectId) {
        console.log('[FATAL] No project available to probe — seed at least one project first');
        return;
    }

    listColdReadLatency.add(listRes.timings.duration);
    for (let i = 0; i < WARM_READ_COUNT; i++) {
        const listWarmRes = http.get(`${baseUrl}/projects`, { tags: { endpoint: 'projects_list', phase: 'warm' } });
        listWarmReadLatency.add(listWarmRes.timings.duration);
        checkCacheHeader(listWarmRes, 'HIT');
        sleep(0.1);
    }


    const coldRes = http.get(`${baseUrl}/projects/${projectId}`, { tags: { endpoint: 'project_details', phase: 'cold' } });
    coldReadLatency.add(coldRes.timings.duration);
    check(coldRes, { 'cold read ok': (r) => r.status === 200 });
    checkCacheHeader(coldRes, 'MISS');

    sleep(0.2);

    for (let i = 0; i < WARM_READ_COUNT; i++) {
        const warmRes = http.get(`${baseUrl}/projects/${projectId}`, { tags: { endpoint: 'project_details', phase: 'warm' } });
        warmReadLatency.add(warmRes.timings.duration);
        check(warmRes, { 'warm read ok': (r) => r.status === 200 });
        checkCacheHeader(warmRes, 'HIT');
        sleep(0.1);
    }

    const marker = `Cache invalidation probe ${Date.now()}`;
    const patchRes = http.patch(`${baseUrl}/projects/${projectId}`, JSON.stringify({
        description: marker,
    }), withCsrfHeader(baseUrl, {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'project_update' },
    }));
    const writeOk = check(patchRes, { 'write accepted': (r) => r.status === 200 });
    if (!writeOk) {

        console.log(`[ERROR] Cache-invalidation write rejected | User: ${user.email} (${user.role}) | ProjectId: ${projectId} | Status: ${patchRes.status} | Body: ${patchRes.body}`);
    }

    sleep(0.2);

    const postRes = http.get(`${baseUrl}/projects/${projectId}`, { tags: { endpoint: 'project_details', phase: 'post_invalidation' } });
    postInvalidationLatency.add(postRes.timings.duration);
    checkCacheHeader(postRes, 'MISS');

    if (!writeOk) {

        console.log('[SKIPPED] Invalidation check skipped because the write was rejected — see the write-rejection log above for the real cause.');
        return;
    }

    let reflectsWrite = false;
    try {
        reflectsWrite = postRes.json().description === marker;
    } catch (e) {
        console.log(`[WARNING] Could not parse post-invalidation response: ${e.message}`);
    }
    invalidationCorrect.add(reflectsWrite);
    check(postRes, {
        'post-invalidation read ok': (r) => r.status === 200,
        'post-invalidation read reflects the write (cache was busted)': () => reflectsWrite,
    });

    if (!reflectsWrite) {
        console.log(`[ERROR] Stale read after write: expected description "${marker}", cache was not invalidated`);
    }
}