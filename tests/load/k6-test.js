import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';

const users = new SharedArray('users', function () {
    return JSON.parse(open('./test-users.json'));
});

// =========================================================
// Metrics - match run
// =========================================================
const matchRunEnqueueDuration = new Trend('match_run_enqueue_duration', true);
const matchRunCompletionDuration = new Trend('match_run_completion_duration', true);
const matchRunPollDuration = new Trend('match_run_poll_duration', true);
const matchRunPollCount = new Counter('match_run_poll_count');
const matchRunEnqueueSuccess = new Rate('match_run_enqueue_success');
const matchRunCompletionSuccess = new Rate('match_run_completion_success');
const matchRunFailureRate = new Rate('match_run_failure_rate');
const matchRunResultIntegrity = new Rate('match_run_result_integrity');

const matchRunProgressComplete = new Rate('match_run_progress_complete');

// =========================================================
// Metrics - writes
// =========================================================
const projectUpdateDuration = new Trend('project_update_duration', true);
const projectUpdateSuccess = new Rate('project_update_success');
const consultantUpdateDuration = new Trend('consultant_update_duration', true);
const consultantUpdateSuccess = new Rate('consultant_update_success');
const scoringOverrideDuration = new Trend('scoring_override_duration', true);
const scoringOverrideSuccess = new Rate('scoring_override_success');

// =========================================================
// Metrics - auth heavy
// =========================================================
const refreshDuration = new Trend('refresh_duration', true);
const refreshSuccess = new Rate('refresh_success');
const refreshReplayRejected = new Rate('refresh_replay_rejected_correctly');
const logoutDuration = new Trend('logout_duration', true);
const logoutSuccess = new Rate('logout_success');

// =========================================================
// Metrics - connection pool stress 
// =========================================================
const dbPoolStressDuration = new Trend('db_pool_stress_duration', true);
const dbPoolStressSuccess = new Rate('db_pool_stress_success');

const maxStatusPolls = Number(__ENV.MATCH_RUN_MAX_POLLS || 60);
const pollIntervalSeconds = Number(__ENV.MATCH_RUN_POLL_INTERVAL || 1);
const concurrentRefreshCalls = Number(__ENV.CONCURRENT_REFRESH_CALLS || 5);

const TEST_PROFILE = __ENV.TEST_PROFILE || 'full';

// =========================================================
// Role-scoped user pools
// =========================================================
const projectManagerUsers = users.filter((u) => u.role === 'ADMIN' || u.role === 'PROJECT_MANAGER');
const consultantManagerUsers = users.filter((u) => u.role === 'CONSULTANT_MANAGER');

if (projectManagerUsers.length === 0) {
    throw new Error('[FATAL] No ADMIN or PROJECT_MANAGER users found in test-users.json - write_project scenario cannot run');
}
if (consultantManagerUsers.length === 0) {
    throw new Error('[FATAL] No CONSULTANT_MANAGER users found in test-users.json - write_consultant scenario cannot run');
}

// =========================================================
// Scenario sets, one per TEST_PROFILE
// =========================================================
const scenarioSets = {
    full: {
        read_heavy: {
            executor: 'ramping-vus',
            exec: 'readHeavyJourney',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 20 },
                { duration: '1m', target: 20 },
                { duration: '15s', target: 0 },
            ],
            tags: { scenario: 'read_heavy' },
        },
        write_project: {
            executor: 'ramping-vus',
            exec: 'writeProjectJourney',
            startVUs: 0,
            startTime: '10s',
            stages: [
                { duration: '30s', target: 5 },
                { duration: '1m', target: 5 },
                { duration: '15s', target: 0 },
            ],
            tags: { scenario: 'write_project' },
        },
        write_consultant: {
            executor: 'ramping-vus',
            exec: 'writeConsultantJourney',
            startVUs: 0,
            startTime: '15s',
            stages: [
                { duration: '30s', target: 3 },
                { duration: '1m', target: 3 },
                { duration: '15s', target: 0 },
            ],
            tags: { scenario: 'write_consultant' },
        },
        auth_heavy: {
            executor: 'ramping-vus',
            exec: 'authHeavyJourney',
            startVUs: 0,
            startTime: '5s',
            stages: [
                { duration: '20s', target: 15 },
                { duration: '40s', target: 15 },
                { duration: '10s', target: 0 },
            ],
            tags: { scenario: 'auth_heavy' },
        },
    },


    match_run_isolated: {
        match_run_isolated: {
            executor: 'shared-iterations',
            exec: 'readHeavyJourney',
            vus: 3,
            iterations: 30,
            maxDuration: '5m',
            tags: { scenario: 'match_run_isolated' },
        },
    },


    match_run_burst: {
        match_run_burst: {
            executor: 'shared-iterations',
            exec: 'readHeavyJourney',
            vus: 20,
            iterations: 20,
            maxDuration: '5m',
            tags: { scenario: 'match_run_burst' },
        },
    },


    pool_stress: {
        db_pool_stress: {
            executor: 'constant-arrival-rate',
            exec: 'poolStressJourney',
            rate: Number(__ENV.POOL_STRESS_RATE || 30),
            timeUnit: '1s',
            duration: '30s',
            preAllocatedVUs: 50,
            maxVUs: 100,
            tags: { scenario: 'pool_stress' },
        },
    },
};

if (!scenarioSets[TEST_PROFILE]) {
    throw new Error(`[FATAL] Unknown TEST_PROFILE "${TEST_PROFILE}". Valid: ${Object.keys(scenarioSets).join(', ')}`);
}

const thresholdSets = {
    full: {
        'http_req_failed{endpoint:auth_refresh}': ['rate<1.0'],
        'http_req_failed{endpoint:!auth_refresh}': ['rate<0.01'],
        http_req_duration: ['p(95)<800'],
        'group_duration{group:::01_Login}': ['avg<800'],
        match_run_enqueue_duration: ['p(95)<800'],
        match_run_enqueue_success: ['rate>0.99'],
        match_run_completion_duration: ['p(95)<30000'],
        match_run_completion_success: ['rate>0.95'],
        match_run_failure_rate: ['rate<0.05'],
        match_run_result_integrity: ['rate>0.99'],
        match_run_progress_complete: ['rate>0.99'],
        project_update_success: ['rate>0.98'],
        consultant_update_success: ['rate>0.98'],
        scoring_override_success: ['rate>0.98'],
        refresh_success: ['rate>0.99'],
        refresh_replay_rejected_correctly: ['rate>0.95'],
        logout_success: ['rate>0.99'],
    },

    match_run_isolated: {
        match_run_completion_duration: ['p(95)<5000'],
        match_run_completion_success: ['rate>0.95'],
        match_run_progress_complete: ['rate>0.99'],
        match_run_result_integrity: ['rate>0.99'],
    },

    match_run_burst: {
        match_run_completion_success: ['rate>0.90'],
        match_run_progress_complete: ['rate>0.90'],
        match_run_result_integrity: ['rate>0.95'],
    },
    pool_stress: {
        db_pool_stress_success: ['rate>0.99'],
        db_pool_stress_duration: ['p(95)<3000'],
    },
};

export const options = {
    scenarios: scenarioSets[TEST_PROFILE],
    thresholds: thresholdSets[TEST_PROFILE],
};

export function setup() {
    const baseUrl = __ENV.TARGET_URL || 'http://localhost:3000';


    let authCookieHeader;
    if (TEST_PROFILE === 'pool_stress') {
        const probeUser = users.find((u) => u.role === 'ADMIN' || u.role === 'CONSULTANT_MANAGER');
        if (!probeUser) {
            throw new Error('[FATAL] pool_stress needs at least one ADMIN or CONSULTANT_MANAGER user in test-users.json to authenticate the shared probe session');
        }
        const loginRes = login(baseUrl, probeUser);
        if (loginRes.status !== 200 && loginRes.status !== 201) {
            throw new Error(`[FATAL] pool_stress setup login failed with status ${loginRes.status}: ${loginRes.body}`);
        }
        authCookieHeader = Object.entries(loginRes.cookies)
            .map(([name, jar]) => `${name}=${jar[0].value}`)
            .join('; ');
        if (!authCookieHeader) {
            throw new Error('[FATAL] pool_stress setup login succeeded but no cookies were returned - check the auth response shape');
        }
    }

    return { baseUrl, authCookieHeader };
}

// =========================================================
// Shared helpers
// =========================================================

function pickUser() {
    return users[Math.floor(Math.random() * users.length)]; // NOSONAR
}

function pickProjectManager() {
    return projectManagerUsers[Math.floor(Math.random() * projectManagerUsers.length)]; // NOSONAR
}

function pickConsultantManager() {
    return consultantManagerUsers[Math.floor(Math.random() * consultantManagerUsers.length)]; // NOSONAR
}

function login(baseUrl, user) {
    const res = http.post(`${baseUrl}/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password,
    }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'auth_login' },
    });
    check(res, {
        'login successful': (r) => r.status === 200 || r.status === 201,
        'has auth cookie': (r) => r.cookies['your_cookie_name'] !== undefined || r.headers['Set-Cookie'] !== undefined,
    });
    return res;
}

function getProjectId(response) {
    if (response.status !== 200) {
        console.log(`[WARNING] GET /projects Failed | Status: ${response.status} | Body: ${response.body}`);
        return undefined;
    }
    try {
        const projects = response.json().projects;
        if (Array.isArray(projects) && projects.length > 0) {
            return projects[Math.floor(Math.random() * projects.length)].id; // NOSONAR
        }
    } catch (error) {
        console.log(`Failed to parse projects: ${error.message}`);
    }
    return undefined;
}

function getConsultantId(response) {
    try {
        const body = response.json();
        const consultants = Array.isArray(body) ? body : body.consultants;
        if (Array.isArray(consultants) && consultants.length > 0) {
            return consultants[Math.floor(Math.random() * consultants.length)].id; // NOSONAR
        }
    } catch (error) {
        console.log(`Failed to parse consultants: ${error.message}`);
    }
    return undefined;
}

function randomWeights() {
    const raw = Array.from({ length: 5 }, () => Math.random()); // NOSONAR
    const sum = raw.reduce((a, b) => a + b, 0);
    const scaled = raw.map((w) => Math.floor((w / sum) * 100));
    const usedSum = scaled.reduce((a, b) => a + b, 0);
    scaled[0] += 100 - usedSum;
    return scaled;
}

function sanitizeUser(user) {
    const { password, ...safe } = user;
    return safe;
}

function pollUntilComplete(baseUrl, projectId, runId) {
    const startedAt = Date.now();
    let lastStatus;

    for (let attempt = 0; attempt < maxStatusPolls; attempt++) {
        const response = http.get(
            `${baseUrl}/projects/${projectId}/match-run/${runId}/status`,
            { tags: { endpoint: 'match_run_status' } },
        );

        matchRunPollDuration.add(response.timings.duration);
        matchRunPollCount.add(1);

        const validResponse = check(response, {
            'match run status request succeeded': (r) => r.status === 200,
            'match run status is valid': (r) => {
                const body = r.json();
                return ['IN_PROGRESS', 'COMPLETED', 'FAILED'].includes(body.status);
            },
        });
        if (!validResponse) {
            return { completed: false, failed: true, status: lastStatus };
        }

        lastStatus = response.json();
        if (lastStatus.status === 'COMPLETED') {

            let duration = Date.now() - startedAt;
            if (duration < 0) {
                console.log(`[WARNING] Negative match-run duration detected (${duration}ms) for run ${runId} - likely a system clock adjustment during the test. Clamping to 0.`);
                duration = 0;
            }
            return { completed: true, failed: false, status: lastStatus, duration };
        }
        if (lastStatus.status === 'FAILED') {
            console.log(`[ERROR] Match run ${runId} failed: ${lastStatus.errorMessage || 'unknown error'}`);
            return { completed: false, failed: true, status: lastStatus };
        }
        sleep(pollIntervalSeconds);
    }

    return { completed: false, failed: true, status: lastStatus };
}

// =========================================================
// SCENARIO: read_heavy / match_run_isolated / match_run_burst all reuse
// =========================================================
export function readHeavyJourney(data) {
    const user = pickUser();
    let projectId;
    let canViewProjects = false;

    group('01_Login', function () {
        login(data.baseUrl, user);
    });
    group('02_Dashboard_Load', function () {

        const batchRequests = [
            ['GET', `${data.baseUrl}/notifications`, null],
        ];

        canViewProjects = user.role === 'ADMIN' || user.role === 'PROJECT_MANAGER';
        if (canViewProjects) {
            batchRequests.push(['GET', `${data.baseUrl}/projects`, null]);
        }

        const canViewConsultants = user.role === 'ADMIN' || user.role === 'CONSULTANT_MANAGER';
        if (canViewConsultants) {
            batchRequests.push(['GET', `${data.baseUrl}/consultants`, null]);
        }

        const responses = http.batch(batchRequests);

        let resIndex = 0;

        check(responses[resIndex], { 'notifications loaded': (r) => r.status === 200 });
        resIndex++;

        if (canViewProjects) {
            check(responses[resIndex], { 'projects loaded': (r) => r.status === 200 });
            projectId = getProjectId(responses[resIndex]);
            resIndex++;
        }

        if (canViewConsultants) {
            check(responses[resIndex], { 'consultants loaded': (r) => r.status === 200 });
        }
    });

    sleep(Math.random() * 2 + 1); // NOSONAR

    if (projectId) {
        group('03_MatchRun', function () {
            const projectRes = http.get(`${data.baseUrl}/projects/${projectId}`, {
                tags: { endpoint: 'project_details' },
            });
            check(projectRes, { 'project details loaded': (r) => r.status === 200 });

            const matchRunRes = http.post(`${data.baseUrl}/projects/${projectId}/match-run`, null, {
                tags: { endpoint: 'match_run_enqueue' },
            });

            matchRunEnqueueDuration.add(matchRunRes.timings.duration);

            const enqueueValid = check(matchRunRes, {
                'match run enqueued': (r) => r.status === 200 || r.status === 201,
                'enqueue response contains run id': (r) => {
                    const body = r.json();
                    return typeof body.runId === 'string' && body.status === 'IN_PROGRESS';
                },
            });
            matchRunEnqueueSuccess.add(enqueueValid);

            if (!enqueueValid) {
                matchRunCompletionSuccess.add(false);
                matchRunFailureRate.add(true);
                console.log(`[ERROR] Match Run Failed for Project ${projectId}: ${matchRunRes.body}`);
                return;
            }

            const runId = matchRunRes.json('runId');
            const outcome = pollUntilComplete(data.baseUrl, projectId, runId);
            const completed = outcome.completed === true;
            matchRunCompletionDuration.add(outcome.duration || maxStatusPolls * pollIntervalSeconds * 1000);
            matchRunCompletionSuccess.add(completed);
            matchRunFailureRate.add(!completed);

            const progressOk = completed && outcome.status?.progress === 100;
            matchRunProgressComplete.add(progressOk);
            check(outcome, {
                'match run completed before timeout': (value) => value.completed,
                'completed match run reached 100 percent': () => progressOk,
            });

            if (!completed) {
                matchRunResultIntegrity.add(false);
                return;
            }

            const resultsRes = http.get(
                `${data.baseUrl}/projects/${projectId}/match-run/${runId}`,
                { tags: { endpoint: 'match_run_results' } },
            );
            const results = resultsRes.status === 200 ? resultsRes.json() : null;
            const validResults = resultsRes.status === 200 &&
                Array.isArray(results) &&
                results.every((result) =>
                    typeof result.consultantId === 'string' &&
                    typeof result.rank === 'number' &&
                    typeof result.finalScore === 'number');
            matchRunResultIntegrity.add(validResults);
            check(resultsRes, {
                'completed match run results loaded': (r) => r.status === 200,
                'completed match run results are valid': () => validResults,
            });
        });
    } else if (canViewProjects) {
        console.log(`[WARNING] Skipping MatchRun. ${user.role} user got no projectId despite having project visibility - GET /projects may have returned an empty list.`);
    }

    sleep(1);
}

// =========================================================
// SCENARIO: write_project
// =========================================================
export function writeProjectJourney(data) {
    const user = pickProjectManager();
    let projectId;

    group('WP01_Login', function () {
        login(data.baseUrl, user);
    });

    group('WP02_Load_Projects', function () {
        const res = http.get(`${data.baseUrl}/projects`, { tags: { endpoint: 'projects_list' } });
        projectId = getProjectId(res);
    });

    sleep(Math.random() * 1 + 0.5); // NOSONAR

    if (!projectId) {
        console.log(`[WARNING] write_project: no projectId found for ${user.role} ${user.email}, skipping writes`);
        sleep(1);
        return;
    }

    if (user.role !== 'PROJECT_MANAGER') {
        sleep(1);
        return;
    }

    group('WP03_Update_Project', function () {

        const detailsRes = http.get(`${data.baseUrl}/projects/${projectId}`, {
            tags: { endpoint: 'project_details_pre_update' },
        });
        let projectDetails = null;
        try {
            projectDetails = detailsRes.status === 200 ? detailsRes.json() : null;
        } catch (e) {
            console.log(`[WP03] Failed to parse project details for ${projectId}: ${e.message}`);
        }

        const payload = JSON.stringify({
            description: `Load test update ${Date.now()}`,
        });
        const res = http.patch(`${data.baseUrl}/projects/${projectId}`, payload, {
            headers: { 'Content-Type': 'application/json' },
            tags: { endpoint: 'project_update' },
        });

        if (res.status !== 200) {
            console.log(`[WP03] Project Update Failed | User: ${JSON.stringify(sanitizeUser(user))} | ProjectId: ${projectId} | ProjectDetails: ${JSON.stringify(projectDetails)} | Status: ${res.status} | Body: ${res.body}`);
        }

        projectUpdateDuration.add(res.timings.duration);
        projectUpdateSuccess.add(check(res, {
            'project update accepted': (r) => r.status === 200,
        }));
    });

    group('WP04_Project_Scoring_Override', function () {

        const [skill, competency, cost, location, availability] = randomWeights();
        const payload = JSON.stringify({
            factors: [
                { factorName: 'SKILL_ALIGNMENT', overrideWeight: skill, active: true, hardExclusionEnabled: false },
                { factorName: 'COMPETENCY_LEVEL', overrideWeight: competency, active: true, hardExclusionEnabled: false },
                { factorName: 'COST_TO_COMPANY', overrideWeight: cost, active: true, hardExclusionEnabled: false },
                { factorName: 'LOCATION', overrideWeight: location, active: true, hardExclusionEnabled: false },
                { factorName: 'AVAILABILITY', overrideWeight: availability, active: true, hardExclusionEnabled: false },
            ],
        });
        const res = http.put(`${data.baseUrl}/config/scoring/${projectId}/scoring-override`, payload, {
            headers: { 'Content-Type': 'application/json' },
            tags: { endpoint: 'scoring_override' },
        });

        if (res.status !== 200 && res.status !== 201) {
            console.log(`[WP04] Scoring Override Failed | Status: ${res.status} | Body: ${res.body}`);
        }

        scoringOverrideDuration.add(res.timings.duration);
        scoringOverrideSuccess.add(check(res, {
            'scoring override accepted': (r) => r.status === 200,
        }));
    });

    sleep(1);
}

// =========================================================
// SCENARIO: write_consultant
// =========================================================
export function writeConsultantJourney(data) {
    const user = pickConsultantManager();
    let consultantId;

    group('WC01_Login', function () {
        login(data.baseUrl, user);
    });

    group('WC02_Load_Consultants', function () {
        const res = http.get(`${data.baseUrl}/consultants`, { tags: { endpoint: 'consultants_list' } });
        consultantId = getConsultantId(res);
    });

    sleep(Math.random() * 1 + 0.5); // NOSONAR

    if (!consultantId) {
        console.log(`[WARNING] write_consultant: no consultantId found for ${user.role} ${user.email}, skipping write`);
        sleep(1);
        return;
    }

    group('WC03_Update_Consultant', function () {

        const availabilityOptions = ['AVAILABLE', 'UNAVAILABLE', 'ON_LEAVE'];
        const payload = JSON.stringify({
            availability: availabilityOptions[Math.floor(Math.random() * availabilityOptions.length)],
        });
        const res = http.patch(`${data.baseUrl}/consultants/${consultantId}`, payload, {
            headers: { 'Content-Type': 'application/json' },
            tags: { endpoint: 'consultant_update' },
        });

        if (res.status !== 200) {
            console.log(`[WC03] Consultant Update Failed | Status: ${res.status} | Body: ${res.body}`);
        }

        consultantUpdateDuration.add(res.timings.duration);
        consultantUpdateSuccess.add(check(res, {
            'consultant update accepted': (r) => r.status === 200,
        }));
    });

    sleep(1);
}

// =========================================================
// SCENARIO: auth_heavy
// =========================================================
export function authHeavyJourney(data) {
    const user = pickUser();

    group('A01_Login', function () {
        login(data.baseUrl, user);
    });

    sleep(0.2);

    group('A02_Concurrent_Refresh', function () {

        const batchRequests = Array.from({ length: concurrentRefreshCalls }, () => (
            ['POST', `${data.baseUrl}/auth/refresh`, null, { tags: { endpoint: 'auth_refresh' } }]
        ));
        const responses = http.batch(batchRequests);

        const successCount = responses.filter((r) => r.status === 200 || r.status === 201).length;
        const rejectedCount = responses.filter((r) => r.status === 401 || r.status === 403).length;

        const avgRefreshDuration = responses.reduce((sum, r) => sum + r.timings.duration, 0) / responses.length;
        refreshDuration.add(avgRefreshDuration);
        refreshSuccess.add(successCount >= 1);
        refreshReplayRejected.add(successCount === 1 && rejectedCount === responses.length - 1);

        check(responses, {
            'exactly one refresh won the race': () => successCount === 1,
            'remaining refreshes flagged as replay': () => rejectedCount === responses.length - 1,
        });

        if (successCount !== 1) {
            console.log(`[WARNING] Refresh race: ${successCount} successes, ${rejectedCount} rejections (expected 1 success, ${concurrentRefreshCalls - 1} rejections)`);
        }
    });

    sleep(Math.random() * 1 + 0.5); // NOSONAR

    group('A03_Logout', function () {
        const res = http.post(`${data.baseUrl}/auth/logout`, null, {
            tags: { endpoint: 'auth_logout' },
        });
        logoutDuration.add(res.timings.duration);
        logoutSuccess.add(check(res, {
            'logout successful': (r) => r.status === 200 || r.status === 201 || r.status === 204,
        }));
    });

    sleep(1);
}

// =========================================================
// SCENARIO: pool_stress
// =========================================================
export function poolStressJourney(data) {
    const res = http.get(`${data.baseUrl}/consultants`, {
        headers: { Cookie: data.authCookieHeader },
        tags: { endpoint: 'pool_stress' },
    });

    dbPoolStressDuration.add(res.timings.duration);
    const ok = check(res, {
        'pool stress read ok': (r) => r.status === 200,
    });
    dbPoolStressSuccess.add(ok);
    if (!ok) {
        console.log(`[ERROR] pool_stress read failed | Status: ${res.status} | Body: ${res.body}`);
    }
}