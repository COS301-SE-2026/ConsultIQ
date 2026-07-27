/**
 * @file seed.ts
 * @description Seeds ConsultIQ with:
 *   1. All RBAC Permissions and RoleDefinitions
 *   2. Permission assignments per role
 *   3. Bootstrap Admin & Reserved Users (PM, CM, Consultant) via env vars
 *   4. Categorized Skills
 *   5. Completed Consultant Profile (Alice Consultant)
 *   6. Completed Projects & Project Requirements
 *   7. Auto-generates 30 additional Consultants with full profiles
 *   8. Auto-generates 30 additional Projects with skill requirements
 */

import {
    PrismaClient,
    Role,
    UserStatus,
    CompetencyLevel,
    ConsultantAvailability,
    ProjectStatus,
    JobType,
    WorkModel,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// =============================================================================
// 1. Data Generators & Constants
// =============================================================================

const PERMISSIONS = [
    { name: 'consultant_profile:read', description: 'View consultant profiles' },
    { name: 'consultant_profile:create', description: 'Create a new consultant profile' },
    { name: 'consultant_profile:update', description: 'Edit an existing consultant profile' },
    { name: 'consultant_profile:delete', description: 'Delete a consultant profile' },
    { name: 'scoring:read', description: 'View consultant scores and evaluations' },
    { name: 'scoring:write', description: 'Run or update scoring evaluations' },
    { name: 'placement:read', description: 'View placement dashboard and records' },
    { name: 'placement:create', description: 'Create a new placement record' },
    { name: 'placement:update', description: 'Update an existing placement record' },
    { name: 'placement:delete', description: 'Delete a placement record' },
    { name: 'cv:upload', description: 'Upload a CV for parsing' },
    { name: 'cv:read', description: 'View parsed CV data' },
    { name: 'cv:delete', description: 'Delete a parsed CV record' },
    { name: 'ctc:read', description: 'View cost-to-company financial data' },
    { name: 'ctc:write', description: 'Edit cost-to-company financial data' },
    { name: 'user:read', description: 'View user accounts' },
    { name: 'user:create', description: 'Create new user accounts' },
    { name: 'user:update', description: 'Update user accounts' },
    { name: 'user:delete', description: 'Delete user accounts' },
    { name: 'user:assign_role', description: 'Assign or change roles for users' },
    { name: 'user:suspend', description: 'Suspend or unlock user accounts' },
    { name: 'user:unlock', description: 'Suspend or unlock user accounts' },
    { name: 'audit:read', description: 'View authentication and system audit logs' },
];

const ROLE_PERMISSIONS: Record<Role, string[]> = {
    [Role.SUPER_ADMIN]: PERMISSIONS.map((p) => p.name),
    [Role.ADMIN]: PERMISSIONS.map((p) => p.name),
    [Role.PROJECT_MANAGER]: [
        'consultant_profile:read', 'scoring:read', 'placement:read', 'placement:create',
        'placement:update', 'cv:read', 'audit:read',
    ],
    [Role.CONSULTANT_MANAGER]: [
        'consultant_profile:read', 'consultant_profile:create', 'consultant_profile:update',
        'scoring:read', 'scoring:write', 'placement:read', 'cv:upload', 'cv:read',
        'cv:delete', 'ctc:read',
    ],
    [Role.CONSULTANT]: [
        'consultant_profile:read', 'scoring:read', 'placement:read', 'cv:read',
    ],
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
    [Role.SUPER_ADMIN]: 'Super Administrator with unrestricted system access.',
    [Role.ADMIN]: 'Full system access. Manages users, roles, permissions, and all data.',
    [Role.PROJECT_MANAGER]: 'Manages placements and dashboards. No access to CTC data.',
    [Role.CONSULTANT_MANAGER]: 'Manages consultant profiles, scoring, CV parsing, and CTC data.',
    [Role.CONSULTANT]: 'Self-service access to own profile, scores, and placements.',
};

const EXTENDED_SKILLS = [
    { name: 'TypeScript', category: 'Programming Languages' },
    { name: 'Node.js', category: 'Backend Development' },
    { name: 'PostgreSQL', category: 'Databases' },
    { name: 'React', category: 'Frontend Development' },
    { name: 'AWS', category: 'Cloud & DevOps' },
    { name: 'Python', category: 'Programming Languages' },
    { name: 'Docker', category: 'Cloud & DevOps' },
    { name: 'Java', category: 'Programming Languages' },
    { name: 'C#', category: 'Programming Languages' },
    { name: 'Kubernetes', category: 'Cloud & DevOps' },
    { name: 'Angular', category: 'Frontend Development' },
    { name: 'MongoDB', category: 'Databases' },
    { name: 'Spring Boot', category: 'Backend Development' },
    { name: 'Azure', category: 'Cloud & DevOps' },
    { name: 'GraphQL', category: 'Backend Development' },
];

const MOCK_DATA = {
    firstNames: ["Liam", "Emma", "Noah", "Olivia", "William", "Ava", "James", "Isabella", "Oliver", "Sophia", "Benjamin", "Mia", "Elijah", "Charlotte", "Lucas", "Amelia", "Mason", "Harper", "Logan", "Evelyn", "Alexander", "Abigail", "Ethan", "Emily", "Jacob", "Elizabeth", "Michael", "Mila", "Daniel", "Ella"],
    lastNames: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"],
    locations: [
        { city: "Pretoria", province: "Gauteng", zip: "0001" },
        { city: "Johannesburg", province: "Gauteng", zip: "2000" },
        { city: "Cape Town", province: "Western Cape", zip: "8000" },
        { city: "Durban", province: "KwaZulu-Natal", zip: "4000" }
    ],
    universities: ["University of Pretoria", "Wits University", "University of Cape Town", "University of Johannesburg", "Stellenbosch University"],
    degrees: ["BSc Computer Science", "BEng Software Engineering", "BCom Informatics", "BSc Information Technology"],
    companies: ["TechFlow SA", "DevCorp Global", "CloudSync", "DataMinds", "InnovateTech", "CyberSecure", "WebWorks", "Appify Solutions"],
    jobTitles: ["Software Engineer", "Full Stack Developer", "Backend Engineer", "Cloud Architect", "DevOps Engineer", "Data Engineer"],
    projectPrefixes: ["Global", "Enterprise", "Cloud", "Smart", "NextGen", "Agile", "Digital", "Core", "Legacy", "Dynamic"],
    projectSuffixes: ["Migration", "Dashboard", "Portal", "API Gateway", "Analytics Hub", "CRM Upgrade", "ERP Implementation", "Transformation", "Microservices", "Data Lake"],
    clients: ["FinBank", "HealthNet", "RetailCorp", "EduTech Inc", "GovServices", "Logistics SA", "AutoDrive", "MediaStream"]
};

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomSample = <T>(arr: T[], count: number): T[] => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);

async function main() {
    console.log('🌱 Starting ConsultIQ database seed...\n');

    // --- Step 1: Permissions ---
    console.log('Seeding permissions...');
    for (const permission of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: { description: permission.description },
            create: { name: permission.name, description: permission.description },
        });
    }

    // --- Step 2: Role Definitions ---
    console.log('Seeding role definitions...');
    for (const role of Object.values(Role)) {
        await prisma.roleDefinition.upsert({
            where: { name: role },
            update: { description: ROLE_DESCRIPTIONS[role] },
            create: { name: role, description: ROLE_DESCRIPTIONS[role] },
        });
    }

    // --- Step 3: Role -> Permission Assignments ---
    console.log('Assigning permissions to roles...');
    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
        const roleRecord = await prisma.roleDefinition.findUnique({ where: { name: roleName as Role } });
        if (!roleRecord) continue;
        for (const permissionName of permissionNames) {
            const permRecord = await prisma.permission.findUnique({ where: { name: permissionName } });
            if (!permRecord) continue;
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: roleRecord.id, permissionId: permRecord.id } },
                update: {},
                create: { roleId: roleRecord.id, permissionId: permRecord.id },
            });
        }
    }

    // --- Helper: Seed User Account ---
    async function seedUser(email: string, fullName: string, plainPassword: string, roleEnum: Role) {
        const roleRecord = await prisma.roleDefinition.findUnique({ where: { name: roleEnum } });
        const passwordHash = await bcrypt.hash(plainPassword, 12);
        return prisma.user.upsert({
            where: { email },
            update: { fullName, role: roleEnum, roleId: roleRecord?.id, status: UserStatus.ACTIVE },
            create: {
                email, fullName, passwordHash, role: roleEnum, roleId: roleRecord?.id,
                status: UserStatus.ACTIVE, failedAttempts: 0, isLocked: false,
            },
        });
    }

    // --- Step 4: Bootstrap & Reserved Users ---
    console.log('Seeding reserved user accounts...');
    const adminUser = await seedUser(
        process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@consultiq.dev',
        process.env.BOOTSTRAP_ADMIN_FULL_NAME || 'System Administrator',
        process.env.BOOTSTRAP_ADMIN_PASSWORD || 'SecureAdminPass123!',
        Role.ADMIN
    );
    const pmUser = await seedUser(
        process.env.BOOTSTRAP_PM_EMAIL || 'pm@consultiq.dev',
        process.env.BOOTSTRAP_PM_FULL_NAME || 'Jane Project',
        process.env.BOOTSTRAP_PM_PASSWORD || 'SecurePMPass123!',
        Role.PROJECT_MANAGER
    );
    const cmUser = await seedUser(
        process.env.BOOTSTRAP_CM_EMAIL || 'cm@consultiq.dev',
        process.env.BOOTSTRAP_CM_FULL_NAME || 'John Manager',
        process.env.BOOTSTRAP_CM_PASSWORD || 'SecureCMPass123!',
        Role.CONSULTANT_MANAGER
    );
    const consultantUser = await seedUser(
        process.env.BOOTSTRAP_CONSULTANT_EMAIL || 'consultant@consultiq.dev',
        process.env.BOOTSTRAP_CONSULTANT_FULL_NAME || 'Alice Consultant',
        process.env.BOOTSTRAP_CONSULTANT_PASSWORD || 'SecureConsultantPass123!',
        Role.CONSULTANT
    );

    // --- Step 5: Skills ---
    console.log('🛠️  Seeding extended skills pool...');
    const skillRecords = await Promise.all(
        EXTENDED_SKILLS.map((skill) =>
            prisma.skill.upsert({
                where: { name: skill.name },
                update: { category: skill.category },
                create: { name: skill.name, category: skill.category },
            })
        )
    );

    // --- Step 6: Alice's Consultant Profile ---
    console.log('Seeding complete profile for Alice Consultant...');
    const aliceProfile = await prisma.consultant.upsert({
        where: { userId: consultantUser.id },
        update: {},
        create: {
            userId: consultantUser.id,
            addressLine1: '123 Innovation Way',
            suburb: 'Hatfield', city: 'Pretoria', province: 'Gauteng', postalCode: '0083',
            phone: '+27 82 123 4567', idNumber: '9801015000087', nationality: 'South African',
            costToCompany: 650000.0, availability: ConsultantAvailability.AVAILABLE,
        },
    });

    await prisma.consultantManager.upsert({
        where: { userId_consultantId: { userId: cmUser.id, consultantId: aliceProfile.id } },
        update: {}, create: { userId: cmUser.id, consultantId: aliceProfile.id },
    });

    // --- Step 7: 30 Additional Consultants ---
    console.log('Generating 30 additional consultants...');
    for (let i = 1; i <= 30; i++) {
        const firstName = randomItem(MOCK_DATA.firstNames);
        const lastName = randomItem(MOCK_DATA.lastNames);
        const fullName = `${firstName} ${lastName}`;
        const email = `consultant${i}@consultiq.dev`;
        const loc = randomItem(MOCK_DATA.locations);

        // 1. Create User
        const cUser = await seedUser(email, fullName, 'SecureConsultantPass123!', Role.CONSULTANT);

        // 2. Create Profile
        const cProfile = await prisma.consultant.upsert({
            where: { userId: cUser.id },
            update: {},
            create: {
                userId: cUser.id,
                addressLine1: `${randomInt(1, 999)} Random Street`,
                city: loc.city,
                province: loc.province,
                postalCode: loc.zip,
                phone: `+27 7${randomInt(1, 9)} ${randomInt(100, 999)} ${randomInt(1000, 9999)}`,
                nationality: 'South African',
                costToCompany: randomInt(350000, 1200000),
                availability: randomItem(Object.values(ConsultantAvailability)),
            },
        });

        // 3. Assign to Consultant Manager
        await prisma.consultantManager.upsert({
            where: { userId_consultantId: { userId: cmUser.id, consultantId: cProfile.id } },
            update: {}, create: { userId: cmUser.id, consultantId: cProfile.id },
        });

        // 4. Assign Skills (2 to 5 random skills)
        const cSkills = randomSample(skillRecords, randomInt(2, 5));
        for (const skill of cSkills) {
            await prisma.consultantSkill.upsert({
                where: { consultantId_skillId: { consultantId: cProfile.id, skillId: skill.id } },
                update: {},
                create: {
                    consultantId: cProfile.id,
                    skillId: skill.id,
                    competencyLevel: randomItem(Object.values(CompetencyLevel)),
                    yearsExperience: randomInt(1, 10),
                    confidenceLevel: randomInt(5, 10),
                },
            });
        }

        // 5. Assign Education
        const existingEdu = await prisma.consultantEducation.findFirst({ where: { consultantId: cProfile.id } });
        if (!existingEdu) {
            await prisma.consultantEducation.create({
                data: {
                    consultantId: cProfile.id,
                    institution: randomItem(MOCK_DATA.universities),
                    qualification: randomItem(MOCK_DATA.degrees),
                    startDate: new Date(`${randomInt(2010, 2018)}-01-15`),
                    endDate: new Date(`${randomInt(2014, 2021)}-11-30`),
                },
            });
        }

        // 6. Assign Experience
        const existingExp = await prisma.consultantExperience.findFirst({ where: { consultantId: cProfile.id } });
        if (!existingExp) {
            await prisma.consultantExperience.create({
                data: {
                    consultantId: cProfile.id,
                    jobTitle: randomItem(MOCK_DATA.jobTitles),
                    companyName: randomItem(MOCK_DATA.companies),
                    jobType: JobType.FULL_TIME,
                    workModel: randomItem(Object.values(WorkModel)),
                    startDate: new Date(`${randomInt(2018, 2022)}-02-01`),
                    description: `Worked on scalable infrastructure and core product features.`,
                },
            });
        }
    }

    // --- Step 8: Base Alice Project ---
    console.log('Seeding base project...');
    let baseProject = await prisma.project.findFirst({ where: { projectName: 'ConsultIQ Engine Upgrade' } });
    if (!baseProject) {
        baseProject = await prisma.project.create({
            data: {
                projectName: 'ConsultIQ Engine Upgrade',
                clientName: 'Internal R&D',
                addressLine1: '45 Corporate Boulevard',
                city: 'Pretoria', province: 'Gauteng', postalCode: '0081',
                startDate: new Date('2026-08-01'), teamSize: 4,
                allocation: 100, budget: 1200000.0, status: ProjectStatus.OPEN,
            },
        });
    }

    await prisma.projectManager.upsert({
        where: { userId_projectId: { userId: pmUser.id, projectId: baseProject.id } },
        update: {}, create: { userId: pmUser.id, projectId: baseProject.id },
    });

    // --- Step 9: 30 Additional Projects ---
    console.log('🏢 Generating 30 additional projects...');
    for (let i = 1; i <= 30; i++) {
        const projectName = `${randomItem(MOCK_DATA.projectPrefixes)} ${randomItem(MOCK_DATA.projectSuffixes)} ${i}`;
        const clientName = randomItem(MOCK_DATA.clients);
        const loc = randomItem(MOCK_DATA.locations);

        let p = await prisma.project.findFirst({ where: { projectName } });

        if (!p) {
            p = await prisma.project.create({
                data: {
                    projectName,
                    clientName,
                    description: `Strategic initiative to implement ${projectName} for ${clientName}.`,
                    addressLine1: `${randomInt(1, 999)} Business Park`,
                    city: loc.city,
                    province: loc.province,
                    postalCode: loc.zip,
                    startDate: new Date(`2026-${randomInt(1, 12).toString().padStart(2, '0')}-01`),
                    teamSize: randomInt(2, 10),
                    allocation: randomItem([50, 80, 100]),
                    budget: randomInt(500000, 5000000),
                    status: randomItem(Object.values(ProjectStatus)),
                },
            });
        }

        // Assign Project Manager
        await prisma.projectManager.upsert({
            where: { userId_projectId: { userId: pmUser.id, projectId: p.id } },
            update: {}, create: { userId: pmUser.id, projectId: p.id },
        });

        // Assign Required Skills (1 to 4 random skills)
        const pSkills = randomSample(skillRecords, randomInt(1, 4));
        for (const skill of pSkills) {
            await prisma.projectSkill.upsert({
                where: { projectId_skillId: { projectId: p.id, skillId: skill.id } },
                update: {},
                create: {
                    projectId: p.id,
                    skillId: skill.id,
                    competency: randomItem(Object.values(CompetencyLevel)),
                    years: randomInt(1, 5),
                    mandatory: randomItem([true, true, false]), // 66% chance to be mandatory
                },
            });
        }
    }

    // --- Summary ---
    const counts = {
        permissions: await prisma.permission.count(),
        roles: await prisma.roleDefinition.count(),
        users: await prisma.user.count(),
        skills: await prisma.skill.count(),
        consultants: await prisma.consultant.count(),
        projects: await prisma.project.count(),
    };

    console.log('\n✅ Seed process complete!');
    console.log('📊 Final database counts:');
    console.log(`   Permissions : ${counts.permissions}`);
    console.log(`   Roles       : ${counts.roles}`);
    console.log(`   Users       : ${counts.users}`);
    console.log(`   Skills      : ${counts.skills}`);
    console.log(`   Consultants : ${counts.consultants}`);
    console.log(`   Projects    : ${counts.projects}\n`);
}

main()
    .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });