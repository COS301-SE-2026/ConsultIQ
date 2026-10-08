import { test, expect } from '@playwright/test';
import { PrismaClient, Project } from '../../backend/node_modules/@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

const bcrypt = require('../../backend/node_modules/bcrypt') as any;
import { cleanDatabase } from '../../backend/prisma/prisma-test-utils';

// Prisma point to test db
dotenv.config({ path: path.resolve(__dirname, '../backend/.env.test') });
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

const PM_EMAIL = 'e2e_pm@consultiq.com';
const PM_PASSWORD = 'password123';

test.describe('E2E: Placement Dashboard x Scoring Engine', () => {
    let testProject: Project;
    let testPm;
    let user1, user2, user3;

    test.beforeAll(async () => {
        await cleanDatabase(prisma as any);
        await prisma.consultant.deleteMany();
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: [
                        PM_EMAIL,
                        'perfect@consultiq.com',
                        'partial@consultiq.com',
                        'no@consultiq.com',
                    ],
                },
            },
        });

        // Test project manager (scoring config + placement dashboard are PROJECT_MANAGER only)
        testPm = await prisma.user.create({
            data: {
                email: PM_EMAIL,
                passwordHash: await bcrypt.hash(PM_PASSWORD, 12),
                fullName: 'E2E Project Manager',
                role: 'PROJECT_MANAGER',
                status: 'ACTIVE',
            } as any,
        });

        const backendSkill = await prisma.skill.create({
            data: { name: 'Java', category: 'Backend' },
        });

        testProject = await prisma.project.create({
            data: {
                projectName: 'Capstone Test Project',
                clientName: 'Demo Client',
                status: 'OPEN',
                addressLine1: '123 Tech Street',
                province: 'Gauteng',
                city: 'Pretoria',
                postalCode: '0001',
                teamSize: 5,
                budget: 1000,
                startDate: new Date(),
                allocation: 100,
                // If the backend scopes projects to their PM, link the project here
                // using your actual field name, e.g.:
                // projectManagerId: testPm.id,
                skills: {
                    create: [
                        {
                            skillId: backendSkill.id,
                            competency: 'INTERMEDIATE',
                            years: 3,
                            mandatory: true,
                        },
                    ],
                },
            } as any,
        });

        user1 = await prisma.user.create({ data: { email: 'perfect@consultiq.com', fullName: 'Perfect Match', role: 'CONSULTANT', status: 'ACTIVE' } as any });
        user2 = await prisma.user.create({ data: { email: 'partial@consultiq.com', fullName: 'Partial Match', role: 'CONSULTANT', status: 'ACTIVE' } as any });
        user3 = await prisma.user.create({ data: { email: 'no@consultiq.com', fullName: 'No Match', role: 'CONSULTANT', status: 'ACTIVE' } as any });

        await Promise.all([
            prisma.consultant.create({
                data: {
                    userId: user1.id,
                    costToCompany: 500,
                    addressLine1: '123 Tech St',
                    city: 'Pretoria',
                    province: 'Gauteng',
                    skills: {
                        create: [
                            {
                                skillId: backendSkill.id,
                                competencyLevel: 'EXPERT',
                                yearsExperience: 5,
                                confidenceLevel: 90,
                            },
                        ],
                    },
                } as any,
            }),
            prisma.consultant.create({
                data: {
                    userId: user2.id,
                    costToCompany: 500,
                    addressLine1: '123 Tech St',
                    city: 'Pretoria',
                    province: 'Gauteng',
                    skills: {
                        create: [
                            {
                                skillId: backendSkill.id,
                                competencyLevel: 'BEGINNER',
                                yearsExperience: 1,
                                confidenceLevel: 40,
                            },
                        ],
                    },
                } as any,
            }),
            prisma.consultant.create({
                data: {
                    userId: user3.id,
                    costToCompany: 500,
                    addressLine1: '123 Tech St',
                    city: 'Pretoria',
                    province: 'Gauteng',
                    // No skills to test consultant exclusion
                } as any,
            }),
        ]);
    });

    test.afterAll(async () => {
        await cleanDatabase(prisma as any);

        await prisma.$disconnect();
    });

    test('should score only consultants that possess a skill', async ({ page }) => {
        await page.goto('/login');

        await page.getByLabel('Email').fill(PM_EMAIL);
        await page.getByLabel('Password').fill(PM_PASSWORD);

        page.on('request', (req) => {
            if (req.url().includes('auth') || req.url().includes('login')) {
                console.log('>> REQUEST', req.method(), req.url());
            }
        });
        page.on('response', (res) => {
            if (res.url().includes('auth') || res.url().includes('login')) {
                console.log('<< RESPONSE', res.status(), res.url());
            }
        });

        // Submit form and wait for response
        const [response] = await Promise.all([
            page.waitForResponse(
                (res) => /\/(auth\/)?login/.test(res.url()) && res.request().method() === 'POST',
                { timeout: 10000 }
            ),
            page.locator('button[type="submit"]').click(),
        ]);

        // Gracefully fail and output backend error
        if (!response.ok()) {
            const errorBody = await response.text();
            throw new Error(`\n AUTH FAILURE \n Backend rejected login with code: ${response.status()}\nResponse: ${errorBody}\n`);
        }

        // Wait for auth redirect or session establishment
        await expect(page).not.toHaveURL(/\/login$/);

        // Navigate to project scoring config
        await page.goto(`/project-scoring-config/${testProject.id}`);

        // Fail fast with a clear message if the role guard bounced us
        await expect(page).toHaveURL(new RegExp(`/project-scoring-config/${testProject.id}$`));

        // Click match run button on the scoring config page
        await page.getByRole('button', { name: 'Run Match' }).click();

        await page.waitForURL(/\/placement-dashboard\/.+/);

        await expect(page.getByRole('heading', { name: 'Placement Dashboard' })).toBeVisible();

        // Verify all profiles were evaluated by the scoring algorithm
        await expect(page.getByText('Perfect Match')).toBeVisible();
        await expect(page.getByText('Partial Match')).toBeVisible();

        await expect(page.getByText('Total Evaluated').locator('..')).toContainText('3');
        await expect(page.getByText('Excluded').locator('..')).toContainText('1');
    });
});