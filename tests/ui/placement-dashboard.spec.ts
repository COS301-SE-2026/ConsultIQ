import { test, expect, type Page } from '@playwright/test';

const mockProjectId = 'project-01';
const mockRunId = 'run-01';

const mockStats = {
    totalMatched: 10,
    totalPlaced: 3,
    totalExcluded: 2,
    totalEvaluated: 12,
};

const mockRecommendation = {
    consultantId: 'c1',
    consultantName: 'Benjamin Kennedy',
    consultantEmail: 'benjamin@consultiq.com',
    finalScore: 85,
    rank: 1,
    isPlaced: false,
};

async function mockAuth(page: Page) {
    await page.route('**/auth/me', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                userId: 'test-admin-id',
                email: 'admin@consultiq.com',
                role: 'ADMIN',
                dashboardRoute: '/admin-dashboard',
            })
        });
    });
}

async function mockNetworkRequests(page: Page) {

    await page.route((url) => url.pathname.endsWith(`/projects/${mockProjectId}`), async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: mockProjectId, projectName: 'Mock Dashboard Project', status: 'OPEN' }),
        });
    });

    await page.route((url) => url.pathname.endsWith(`/projects/${mockProjectId}/match-run/${mockRunId}`), async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([mockRecommendation]),
        });
    });

    await page.route((url) => url.pathname.endsWith(`/projects/${mockProjectId}/match-run/${mockRunId}/stats`), async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockStats),
        });
    });

    await page.route((url) => url.pathname.endsWith(`/projects/${mockProjectId}/match-run/${mockRunId}/status`), async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ runId: mockRunId, status: 'COMPLETED', progress: 100 }),
        });
    });
}

test.describe('UI Test Placement Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await mockAuth(page);
        await mockNetworkRequests(page);
    });

    test('should render dashboard header', async ({ page }) => {

        await page.goto(`/placement-dashboard/${mockProjectId}/${mockRunId}`);

        await expect(
            page.getByRole('heading', { level: 1, name: 'Placement Dashboard' })
        ).toBeVisible();
    });

    test('should render match run count stats', async ({ page }) => {

        await page.goto(`/placement-dashboard/${mockProjectId}/${mockRunId}`);

        await expect(page.getByText(String(mockStats.totalEvaluated), { exact: true })).toBeVisible();
        await expect(page.getByText(String(mockStats.totalPlaced), { exact: true })).toBeVisible();
        await expect(page.getByText(String(mockStats.totalExcluded), { exact: true })).toBeVisible();
    });

    test('should present placement service errors with consultant context and recovery guidance', async ({ page }) => {
        const recommendations = Array.from({ length: 10 }, (_, index) => ({
            ...mockRecommendation,
            consultantId: `c${index + 1}`,
            consultantName: `Consultant ${index + 1}`,
            consultantEmail: `consultant${index + 1}@consultiq.com`,
            rank: index + 1,
            finalScore: 90 - index,
        }));
        await page.route((url) => url.pathname.endsWith(`/projects/${mockProjectId}/match-run/${mockRunId}`), async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(recommendations),
            });
        });

        await page.route('**/auth/csrf-token', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                headers: {
                    'access-control-allow-origin': route.request().headers().origin ?? '*',
                    'access-control-allow-credentials': 'true',
                },
                body: JSON.stringify({ csrfToken: 'test-csrf-token' }),
            });
        });

        await page.route((url) => url.pathname.includes(`/projects/${mockProjectId}/placements`), async (route) => {
            const origin = route.request().headers().origin ?? '*';
            if (route.request().method() === 'OPTIONS') {
                await route.fulfill({
                    status: 204,
                    headers: {
                        'access-control-allow-origin': origin,
                        'access-control-allow-credentials': 'true',
                        'access-control-allow-methods': 'POST, OPTIONS',
                        'access-control-allow-headers': 'content-type, x-csrf-token',
                    },
                });
                return;
            }

            await route.fulfill({
                status: 409,
                contentType: 'application/json',
                headers: {
                    'access-control-allow-origin': origin,
                    'access-control-allow-credentials': 'true',
                },
                body: JSON.stringify({ message: 'Cannot place consultant: project team size limit of 3 has been reached.' }),
            });
        });

        await page.goto(`/placement-dashboard/${mockProjectId}/${mockRunId}`);
        const tenthRecommendation = page.getByRole('row').filter({ hasText: 'Consultant 10' });
        await tenthRecommendation.scrollIntoViewIfNeeded();
        await tenthRecommendation.getByRole('button', { name: 'Place Consultant' }).click();
        await tenthRecommendation.getByRole('button', { name: 'Confirm Placement' }).click();

        const placementAlert = page.getByRole('alert');
        await expect(placementAlert).toContainText('Placement could not be completed');
        await expect(placementAlert).toContainText('Recommendation #10: Consultant 10');
        await expect(placementAlert).toContainText('project team size limit of 3');
        await expect(placementAlert).toContainText('Check the project team limit');
        await expect(page.getByRole('button', { name: 'Confirm Placement' })).toBeVisible();

        const failureToast = page.getByText('Placement failed');
        await expect(failureToast).toBeVisible();
        await expect(failureToast).toBeInViewport();
        await expect(page.getByText('Team size limit (Recommendation #10)')).toBeVisible();
        await expect(failureToast).not.toContainText('project team size limit of 3');
        await expect(failureToast).toBeHidden({ timeout: 5000 });
        await expect(placementAlert).toContainText('project team size limit of 3');
    });

    test('should render recommendations passed using router location state', async ({ page }) => {
        await page.route((url) => url.pathname.endsWith(`/projects/${mockProjectId}/match-run/${mockRunId}/status`), async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ runId: mockRunId, status: 'IN_PROGRESS', progress: 50 })
            });
        });

        await page.goto('/');

        await page.waitForSelector('#root > *', { state: 'attached' });

        await page.evaluate(
            ({ projectId, runId, recommendation }) => {
                window.history.pushState(
                    { usr: { rawMatchData: [recommendation] } },
                    '',
                    `/placement-dashboard/${projectId}/${runId}`
                );
                window.dispatchEvent(new PopStateEvent('popstate'));
            },
            { projectId: mockProjectId, runId: mockRunId, recommendation: mockRecommendation }
        );

        await expect(page.getByText(mockRecommendation.consultantName)).toBeVisible();
        await expect(page.getByText(String(mockRecommendation.finalScore))).toBeVisible();
    });
});