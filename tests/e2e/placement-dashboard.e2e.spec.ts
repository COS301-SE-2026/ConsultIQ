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

test.describe('E2E: Placement Dashboard x Scoring Engine', () => {
    let testProject: Project;
    let testAdmin;
    let user1, user2, user3;

    test.beforeAll(async () => {
        await cleanDatabase(prisma as any);
        await prisma.consultant.deleteMany();
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: [
                        'e2e_admin@consultiq.com',
                        'perfect@consultiq.com',
                        'partial@consultiq.com',
                        'no@consultiq.com'
                    ]
                }
            }
        });

        // Test admin
        testAdmin = await prisma.user.create({
            data: {
                email: 'e2e_admin@consultiq.com',
                passwordHash: await bcrypt.hash('password123', 12),
                fullName: 'E2E Admin',
                role: 'ADMIN',
                status: 'ACTIVE',
            } as any
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
                } as any
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
                } as any
            }),
            prisma.consultant.create({
                data: {
                    userId: user3.id,
                    costToCompany: 500,
                    addressLine1: '123 Tech St',
                    city: 'Pretoria',
                    province: 'Gauteng',
                    // No skills to test consultant exclusion 
                } as any
            })
        ]);
    });

    test.afterAll(async () => {
        await cleanDatabase(prisma as any);

        await prisma.$disconnect();
    });

    test('should score only consultants that possess a skill', async ({ page }) => {

        await page.goto('/login');

        await page.getByLabel('Email').fill('e2e_admin@consultiq.com');
        await page.getByLabel('Password').fill('password123');

        // Submit form and wait for response
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

        const [response] = await Promise.all([
            page.waitForResponse(
                (res) => /\/(auth\/)?login/.test(res.url()) && res.request().method() === 'POST',
                { timeout: 10000 }
            ),
            page.locator('button[type="submit"]').click()
        ]);

        // gracefully fail and output backend error 
        if (!response.ok()) {
            const errorBody = await response.text();
            throw new Error(`\n AUTH FAILURE \n Backend rejected login with code: ${response.status()}\nResponse: ${errorBody}\n`);
        }

        // Wait for auth redirect or session establishment
        await expect(page).not.toHaveURL(/\/login$/);

        // Navigate to project scoring config
        await page.goto(`/project-scoring-config/${testProject.id}`);

        // Click match run button on the scoring config page
        await page.getByRole('button', { name: 'Run Match' }).click();

        await page.waitForURL(/\/placement-dashboard\/.+/);

        await expect(page.getByRole('heading', { name: 'Placement Dashboard' })).toBeVisible();
        // 4. ASSERTION: Verify all profiles were evaluated by the scoring algorithm
        await expect(page.getByText('Perfect Match')).toBeVisible();
        await expect(page.getByText('Partial Match')).toBeVisible();
        await expect(page.getByText('No Match')).toBeVisible();

        await expect(page.getByText('Total Evaluated').locator('..')).toContainText('3');
        await expect(page.getByText('Excluded').locator('..')).toContainText('0');
    });
});