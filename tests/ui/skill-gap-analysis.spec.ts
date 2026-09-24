import { expect, test, type Page } from "@playwright/test";

const projectId = 'project-01';

const skills = [
    {   skillId: "skill-1",
        skillName: "Typescript",
        requiredCount: 4,
        availableCount: 2,
        coveragePercent: 50,
        severity: 'CRITICAL',
    },
    {   skillId: "skill-2",
        skillName: "React",
        requiredCount: 3,
        availableCount: 3,
        coveragePercent: 100,
        severity: 'CRITICAL',
    }
];

async function mockAuth(page: Page){
    await page.route('**/auth/me', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                userId: "test-project-manager-id",
                email: "project.manager@consultiq.dev",
                role: "PROJECT_MANAGER",
                dashboardRoute: "/projects",
            }) 
        })
    })
}

async function mockProjectSkillGap(page: Page){
    await page.route(
        (url) => url.pathname.endsWith(`/projects/${projectId}/skill-gap-analysis`),
        async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    projectId,
                    projectName: 'Cloud Migration Project',
                    summary: {
                        overallCoveragePercent: 75,
                        adequatelyCoveredCount: 1,
                        atRiskCount: 0,
                        criticalCount: 1,
                    },
                    skills,
                }),
            });
        },
    );
}

async function mockPortfolioSkillGap(page: Page, alerts = true){
    await page.route(
        (url) => url.pathname.endsWith('/skill-gap-analysis/portfolio'),
        async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    summary: {
                        overallCoveragePercent: 75,
                        adequatelyCoveredCount: 1,
                        atRiskCount: alerts ? 1 : 0,
                        criticalCount: alerts ? 1 : 0,
                    },
                    skills,
                    alerts: alerts ? [
                        {
                            projectId: "project-01",
                            projectName: "Cloud Migration Project",
                            severity: "CRITICAL",
                            gappedSkills: [
                                {
                                    skillName: "Typescript",
                                    requiredCount: 4,
                                    availableCount: 2,
                                },
                            ],
                        },
                    ] : [],
                }),
            });
        },
    );
}

test.describe('Skill Gap Analysis Page', () => {
    test.beforeEach(async ({ page }) => {
        await mockAuth(page);
    });

    test('should render project skill gap analysis', async ({ page }) => {
        await mockProjectSkillGap(page);

        await page.goto(`/skill-gap/${projectId}`);
        await expect(page.getByRole('heading', { level: 1, name: 'Skill Gap Analysis',}),).toBeVisible();
        await expect(page.getByText("Project: Cloud Migration Project")).toBeVisible();

        await expect(page.getByText('Overall Coverage')).toBeVisible();
        await expect(page.getByText('75.0%')).toBeVisible();
        await expect(page.getByText('Adequately Covered')).toBeVisible();
        await expect(page.getByText('Critical Gaps')).toBeVisible();
        
        await expect(page.getByText('Required vs Actual Skills')).toBeVisible();
        await expect(page.getByText('Skill Gap Report')).toBeVisible();
        await expect(page.getByText('Identified Skill Gaps')).toBeVisible();

        await expect(page.getByText("Need 2 more consultants with this skill to meet project requirements.")).toBeVisible();
    
    });

    test("renders portfolio alerts", async ({page}) => {
        await mockPortfolioSkillGap(page);
        await page.goto("/skill-gap");
        await expect(page.getByRole("heading", { level: 1, name: "Portfolio Gap Overview"})).toBeVisible();

        await expect(page.getByText('Project Alerts (1)')).toBeVisible();

        const alertCard = page .getByRole('heading', { name: 'Cloud Migration Project' }).locator('xpath=../../../..');

        await expect(alertCard).toBeVisible();
        await expect(page.getByText('CRITICAL', { exact: true })).toBeVisible();
        await expect(alertCard.getByText('Typescript', { exact: true })).toBeVisible();
        await expect(alertCard.getByText('( 2 / 4 available )')).toBeVisible();
    });

    test("dismissed a portfolio alert", async ({ page }) =>{
        await mockPortfolioSkillGap(page);
        await page.goto("/skill-gap");
        const alertCard = page .getByRole('heading', { name: 'Cloud Migration Project' }).locator('xpath=../../../..');
        await expect(alertCard).toBeVisible();

        await alertCard.getByRole('button', {name: 'Dismiss'}).click();

        await expect(alertCard).toBeHidden();
        await expect(page.getByText("No skill gaps detected across portfolio.")).toBeVisible();   
    });

    test("renders the portfolio empty state when there are no alerts" , async({page}) => {
        await mockPortfolioSkillGap(page, false);
        await page.goto("/skill-gap");
        await expect(page.getByText("No skill gaps detected across portfolio.")).toBeVisible();
        await expect(page.getByText('Project Alerts')).toHaveCount(0);
    });

    test("opens and closes the expanded skill gap chart", async ({ page }) =>{
        await mockProjectSkillGap(page);
        await page.goto(`/skill-gap/${projectId}`);
        await page.getByRole('button', { name: 'Expand skill gap chart' }).click();

        const dialog =page.getByRole('dialog', { name: 'Expanded skill gap chart',});

        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("heading", { name: 'Skill Gap Analysis' })).toBeVisible();
        await dialog.getByRole('button', { name: 'Close expanded chart' }).click();

        await expect(dialog).toBeHidden();
    });
});