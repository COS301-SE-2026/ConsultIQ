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
}

type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'CONSULTANT_MANAGER' | 'CONSULTANT';


//Mock logged in admin with retrieved user account
async function mockAuth(page: Page, role: Role = 'ADMIN') {
    await page.route('***/auth/me', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                userId: 'test-admin-id',
                email: 'admin@consultiq.com',
                role,
                dashboardRoute: '/admin-dashboard',
            })
        })
    })
}

async function mockStatsEndpoint(page: Page,
    { status = 200, body = mockStats }: { status?: number; body?: unknown } = {}) {
    await page.route(`**/projects/${mockProjectId}/match-run/${mockRunId}/stats`, async (route) => {
        await route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(body),
        })
    })
}

test.describe('UI Test Placement Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await mockAuth(page);
        await mockStatsEndpoint(page);
    })

    test('should render dashboard header', async ({ page }) => {
        await page.goto(`/placement-dashboard/${mockProjectId}/${mockRunId}`);

        await expect(
            page.getByRole('heading', { level: 1, name: 'Placement Dashboard' })
        ).toBeVisible();
    });

    test('should render match run count stats', async ({ page }) => {
        const statsResponse = page.waitForResponse(
            (res) => res.url().includes(`${mockProjectId}`) && res.url().includes('stats')
        );
        await page.goto(`/placement-dashboard/${mockProjectId}/${mockRunId}`);
        const res = await statsResponse;
        expect(res.status()).toBe(200);
        const statsArea = page;
        await expect(statsArea.getByText(String(mockStats.totalEvaluated), { exact: true })).toBeVisible();
        await expect(statsArea.getByText(String(mockStats.totalPlaced), { exact: true })).toBeVisible();
        await expect(statsArea.getByText(String(mockStats.totalExcluded), { exact: true })).toBeVisible();
    });


    test('should render recommendations passed using router location state', async ({ page }) => {
        await page.goto('/');

        await page.waitForLoadState('networkidle');

        await page.evaluate(
            ({ projectId, runId, recommendation }) => {
                window.history.pushState(
                    { usr: { rawMatchData: [recommendation] } },
                    '',
                    `/placement-dashboard/${projectId}/${runId}`
                );
                window.dispatchEvent(new PopStateEvent('popstate'));

            }, { projectId: mockProjectId, runId: mockRunId, recommendation: mockRecommendation }
        );

        await expect(page.getByText(mockRecommendation.consultantName)).toBeVisible();
        await expect(page.getByText(String(mockRecommendation.finalScore))).toBeVisible();
    })
})