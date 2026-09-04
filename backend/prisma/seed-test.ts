import { PrismaClient, Role, CompetencyLevel, ProjectStatus, ScoringFactorName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { cleanDatabase } from './prisma-test-utils';
const prisma = new PrismaClient();

async function main() {
    console.log('Starting load-test database preparation...');

    console.log('Cleaning testing database...');

    await cleanDatabase(prisma as any);

    const k6TestUsers: Array<{ id: string; email: string; password: string; role: string }> = [];
    const defaultPassword = 'SecureTestPass123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    console.log('Seeding authorized accounts...');

    const adminUser = await prisma.user.create({
        data: {
            email: 'admin.test@consultiq.com',
            fullName: 'LoadTest Admin',
            passwordHash,
            role: Role.ADMIN,
            status: 'ACTIVE',
        },
    });

    const pmUser = await prisma.user.create({
        data: {
            email: 'pm.test@consultiq.com',
            fullName: 'LoadTest PM',
            passwordHash,
            role: Role.PROJECT_MANAGER,
            status: 'ACTIVE',
        },
    });

    const cmUser = await prisma.user.create({
        data: {
            email: 'cm.test@consultiq.com',
            fullName: 'LoadTest CM',
            passwordHash,
            role: Role.CONSULTANT_MANAGER,
            status: 'ACTIVE',
        },
    });

    k6TestUsers.push(
        { id: adminUser.id, email: adminUser.email, password: defaultPassword, role: Role.ADMIN },
        { id: pmUser.id, email: pmUser.email, password: defaultPassword, role: Role.PROJECT_MANAGER },
        { id: cmUser.id, email: cmUser.email, password: defaultPassword, role: Role.CONSULTANT_MANAGER }
    );

    console.log('Seeding base skills...');
    const javaSkill = await prisma.skill.create({ data: { name: 'Java', category: 'Backend' } });
    const reactSkill = await prisma.skill.create({ data: { name: 'React', category: 'Frontend' } });

    console.log('Seeding consultants for Match Run logic...');
    const consultantsToCreate = 200;

    for (let i = 1; i <= consultantsToCreate; i++) {
        const user = await prisma.user.create({
            data: {
                email: `consultant${i}.test@consultiq.com`,
                fullName: `Test Consultant ${i}`,
                passwordHash,
                role: Role.CONSULTANT,
                status: 'ACTIVE',
            },
        });

        const consultant = await prisma.consultant.create({
            data: {
                userId: user.id,
                costToCompany: 500000 + (i * 10000),
                addressLine1: `${i} Test Ave`,
                city: 'Pretoria',
                province: 'Gauteng',
                skills: {
                    create: [
                        {
                            skillId: i % 2 === 0 ? javaSkill.id : reactSkill.id,
                            competencyLevel: CompetencyLevel.EXPERT,
                            yearsExperience: 5,
                            confidenceLevel: 80,
                        },
                    ],
                },
            },
        });

        await prisma.consultantManager.create({
            data: {
                userId: cmUser.id,
                consultantId: consultant.id
            },
        });

    }

    console.log('Seeding projects...');
    for (let i = 1; i <= 10; i++) {
        const project = await prisma.project.create({
            data: {
                projectName: `Load Test Project ${i}`,
                clientName: 'Test Client',
                addressLine1: '100 Business Rd',
                city: 'Pretoria',
                province: 'Gauteng',
                postalCode: '0001',
                budget: 1000000,
                teamSize: 5,
                startDate: new Date(),
                allocation: 100,
                status: ProjectStatus.OPEN,
                skills: {
                    create: [
                        {
                            skillId: javaSkill.id,
                            competency: CompetencyLevel.INTERMEDIATE,
                            years: 3,
                            mandatory: true,
                        },
                    ],
                },
            },
        });

        await prisma.projectManager.create({
            data: { userId: pmUser.id, projectId: project.id },
        });

        await prisma.projectScoringOverride.createMany({
            data: [
                { projectId: project.id, factorName: ScoringFactorName.SKILL_ALIGNMENT, overrideWeight: 0.6 },
                { projectId: project.id, factorName: ScoringFactorName.COST_TO_COMPANY, overrideWeight: 0.4 },
            ],
        });
    }


    const loadTestDir = path.join(process.cwd(), '..', 'tests', 'load');
    if (!fs.existsSync(loadTestDir)) {
        fs.mkdirSync(loadTestDir, { recursive: true });
    }
    const outputPath = path.join(loadTestDir, 'test-users.json');
    fs.writeFileSync(outputPath, JSON.stringify(k6TestUsers, null, 2));

    console.log(`Testing database seeded successfully!`);
    console.log(`Exported k6 credentials to: ${outputPath}\n`);
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });