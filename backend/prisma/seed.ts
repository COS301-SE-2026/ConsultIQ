/**
 * @file seed.ts
 * @description Seeds ConsultIQ with:
 *   1. All RBAC Permissions and RoleDefinitions
 *   2. Permission assignments per role
 *   3. Bootstrap Admin & Reserved Users
 *   4. Categorized Skills
 *   5. Completed Consultant Profiles (Alice & COS301 Consultant)
 *   6. Completed Projects & Project Requirements
 *   7. Auto-generates 15 Consultants with valid SA IDs & accurate Geo-coordinates
 *   8. Auto-generates 8 Projects with mathematically perfectly aligned budgets
 *   9. Assigns all seeded projects to the COS301 Project Manager
 *   10. Public Holidays (South Africa)
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
    UploadStatus,
    ExtractionStatus,
    CvParsingMethod
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// =============================================================================
// 1. Data Generators & Constants
// =============================================================================

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
    universities: ["University of Pretoria", "Wits University", "University of Cape Town", "University of Johannesburg", "Stellenbosch University"],
    degrees: ["BSc Computer Science", "BEng Software Engineering", "BCom Informatics", "BSc Information Technology"],
    companies: ["TechFlow SA", "DevCorp Global", "CloudSync", "DataMinds", "InnovateTech", "CyberSecure", "WebWorks", "Appify Solutions"],
    jobTitles: ["Software Engineer", "Full Stack Developer", "Backend Engineer", "Cloud Architect", "DevOps Engineer", "Data Engineer"],
    projectPrefixes: ["Global", "Enterprise", "Cloud", "Smart", "NextGen", "Agile", "Digital", "Core", "Legacy", "Dynamic"],
    projectSuffixes: ["Migration", "Dashboard", "Portal", "API Gateway", "Analytics Hub", "CRM Upgrade", "ERP Implementation", "Transformation", "Microservices", "Data Lake"],
    clients: ["FinBank", "HealthNet", "RetailCorp", "EduTech Inc", "GovServices", "Logistics SA", "AutoDrive", "MediaStream"]
};

// --- Real-World South African Locations (Valid Coordinates) ---
const SA_GEO_LOCATIONS = [
    { addressLine1: "1145 Burnett St", suburb: "Hatfield", city: "Pretoria", province: "Gauteng", postalCode: "0083", latitude: -25.749141, longitude: 28.236683, placeId: "ChIJW8w0u6RzlR4RTp3rI9y-3Zk", formattedAddress: "1145 Burnett St, Hatfield, Pretoria, 0083, South Africa" },
    { addressLine1: "1 Sandton Dr", suburb: "Sandown", city: "Sandton", province: "Gauteng", postalCode: "2196", latitude: -26.108422, longitude: 28.053181, placeId: "ChIJJXN5q7lzlw4R8M1gQ1g3X-U", formattedAddress: "1 Sandton Dr, Sandown, Sandton, 2196, South Africa" },
    { addressLine1: "19 Dock Rd", suburb: "Victoria & Alfred Waterfront", city: "Cape Town", province: "Western Cape", postalCode: "8001", latitude: -33.903556, longitude: 18.417438, placeId: "ChIJT_jMvjxnzhQRsV-V3jYy2kM", formattedAddress: "19 Dock Rd, Victoria & Alfred Waterfront, Cape Town, 8001, South Africa" },
    { addressLine1: "1 Lagoon Dr", suburb: "Umhlanga Rocks", city: "Durban", province: "KwaZulu-Natal", postalCode: "4320", latitude: -29.726669, longitude: 31.087413, placeId: "ChIJ_fH1U1QQ-BQRp0-XjA-P504", formattedAddress: "1 Lagoon Dr, Umhlanga Rocks, Durban, 4320, South Africa" },
    { addressLine1: "Lynnwood Rd", suburb: "Brooklyn", city: "Pretoria", province: "Gauteng", postalCode: "0011", latitude: -25.754549, longitude: 28.231436, placeId: "ChIJ7d3Vj51zlR4RN_4lO3-jB6U", formattedAddress: "University of Pretoria, Lynnwood Rd, Pretoria, 0002, South Africa" },
    { addressLine1: "1 Century City Dr", suburb: "Century City", city: "Cape Town", province: "Western Cape", postalCode: "7441", latitude: -33.892300, longitude: 18.510500, placeId: "ChIJ5zG87tNnzRQR57_aJz8XbKw", formattedAddress: "1 Century City Dr, Century City, Cape Town, 7441, South Africa" },
    { addressLine1: "Aramist Ave", suburb: "Waterkloof Glen", city: "Pretoria", province: "Gauteng", postalCode: "0010", latitude: -25.783600, longitude: 28.281700, placeId: "ChIJeT7xMHR0lR4RfE4kI6h9r9w", formattedAddress: "Aramist Ave, Menlyn Maine, Pretoria, 0010, South Africa" },
    { addressLine1: "191 Jan Smuts Ave", suburb: "Rosebank", city: "Johannesburg", province: "Gauteng", postalCode: "2196", latitude: -26.146600, longitude: 28.043600, placeId: "ChIJUYyY3Fhzlw4RM3u6h1OqfA8", formattedAddress: "191 Jan Smuts Ave, Rosebank, Johannesburg, 2196, South Africa" },
    { addressLine1: "Magwa Cres", suburb: "Waterfall City", city: "Midrand", province: "Gauteng", postalCode: "1682", latitude: -26.015100, longitude: 28.106400, placeId: "ChIJQ09Y6Zp0lw4RS57M6-P9hxw", formattedAddress: "Magwa Cres, Waterfall City, Midrand, 1682, South Africa" },
    { addressLine1: "Willie van Schoor Ave", suburb: "Bellville", city: "Cape Town", province: "Western Cape", postalCode: "7530", latitude: -33.878500, longitude: 18.632200, placeId: "ChIJi_O-T8t-zRQR15u8q6IqXzY", formattedAddress: "Willie van Schoor Ave, Tyger Valley, Cape Town, 7530, South Africa" },
    { addressLine1: "Lenchen Ave", suburb: "Centurion Central", city: "Centurion", province: "Gauteng", postalCode: "0157", latitude: -25.855800, longitude: 28.187300, placeId: "ChIJc-2H9C9xlR4RYx2q1yO4tZw", formattedAddress: "Lenchen Ave, Centurion Central, Centurion, 0157, South Africa" },
    { addressLine1: "Techno Ave", suburb: "Technopark", city: "Stellenbosch", province: "Western Cape", postalCode: "7600", latitude: -33.966300, longitude: 18.841400, placeId: "ChIJo6m4P3iOzRQRVfW7kG3T9q0", formattedAddress: "Techno Ave, Technopark, Stellenbosch, 7600, South Africa" },
    { addressLine1: "University Way", suburb: "Summerstrand", city: "Gqeberha", province: "Eastern Cape", postalCode: "6001", latitude: -33.987100, longitude: 25.666100, placeId: "ChIJU-5i4Mthdh4ReG9s5rUe91w", formattedAddress: "University Way, Summerstrand, Gqeberha, 6001, South Africa" },
    { addressLine1: "William Nicol Dr", suburb: "Bryanston", city: "Sandton", province: "Gauteng", postalCode: "2191", latitude: -26.050500, longitude: 28.023200, placeId: "ChIJN89-zJtzlw4R5q5Q2B8x-5w", formattedAddress: "William Nicol Dr, Bryanston, Sandton, 2191, South Africa" },
    { addressLine1: "Main Rd", suburb: "Claremont", city: "Cape Town", province: "Western Cape", postalCode: "7708", latitude: -33.983300, longitude: 18.463800, placeId: "ChIJZ3Vw_5h9zRQRq-2yq5w2g4o", formattedAddress: "Main Rd, Claremont, Cape Town, 7708, South Africa" },
];

// =============================================================================
// Helper Functions
// =============================================================================

const randomItem = <T>(arr: T[]): T => arr[crypto.randomInt(0, arr.length)];
const randomInt = (min: number, max: number): number => crypto.randomInt(min, max + 1);
const getRandomLocation = () => SA_GEO_LOCATIONS[crypto.randomInt(0, SA_GEO_LOCATIONS.length)];

const randomSample = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
};

// Valid South African ID Generator
function generateValidSAID(birthDate: Date, isMale: boolean): string {
    const yy = String(birthDate.getFullYear()).slice(-2);
    const mm = String(birthDate.getMonth() + 1).padStart(2, '0');
    const dd = String(birthDate.getDate()).padStart(2, '0');

    const ssss = String(crypto.randomInt(isMale ? 5000 : 0, isMale ? 9999 : 4999)).padStart(4, '0');
    const baseId = yy + mm + dd + ssss + '08';

    let sum = 0;
    for (let i = 0; i < baseId.length; i++) {
        let digit = parseInt(baseId.charAt(i), 10);
        if (i % 2 !== 0) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }

    const checksum = (10 - (sum % 10)) % 10;
    return baseId + String(checksum);
}

function generateRandomDate(startYear: number, endYear: number): Date {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Financial/Duration Math Helper for Seeding
function getWorkingDays(startDate: Date, endDate: Date): number {
    if (startDate > endDate) return 0;
    let count = 0;
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return count;
}

// --- Public Holiday Generators ---
function getEasterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month, day));
}

function getSAHolidaysForYear(year: number) {
    const fixedHolidays = [
        { date: new Date(Date.UTC(year, 0, 1)), name: "New Year's Day" },
        { date: new Date(Date.UTC(year, 2, 21)), name: "Human Rights Day" },
        { date: new Date(Date.UTC(year, 3, 27)), name: "Freedom Day" },
        { date: new Date(Date.UTC(year, 4, 1)), name: "Workers' Day" },
        { date: new Date(Date.UTC(year, 5, 16)), name: "Youth Day" },
        { date: new Date(Date.UTC(year, 7, 9)), name: "National Women's Day" },
        { date: new Date(Date.UTC(year, 8, 24)), name: "Heritage Day" },
        { date: new Date(Date.UTC(year, 11, 16)), name: "Day of Reconciliation" },
        { date: new Date(Date.UTC(year, 11, 25)), name: "Christmas Day" },
        { date: new Date(Date.UTC(year, 11, 26)), name: "Day of Goodwill" },
    ];

    const easter = getEasterSunday(year);

    const goodFriday = new Date(easter);
    goodFriday.setUTCDate(easter.getUTCDate() - 2);
    fixedHolidays.push({ date: goodFriday, name: "Good Friday" });

    const familyDay = new Date(easter);
    familyDay.setUTCDate(easter.getUTCDate() + 1);
    fixedHolidays.push({ date: familyDay, name: "Family Day" });

    const finalHolidays: Array<{ date: Date, name: string }> = [];

    for (const h of fixedHolidays) {
        finalHolidays.push(h);
        if (h.date.getUTCDay() === 0) {
            const substitute = new Date(h.date);
            if (h.date.getUTCMonth() === 11 && h.date.getUTCDate() === 25) {
                substitute.setUTCDate(substitute.getUTCDate() + 2);
            } else {
                substitute.setUTCDate(substitute.getUTCDate() + 1);
            }
            finalHolidays.push({ date: substitute, name: `${h.name} (Observed)` });
        }
    }
    return finalHolidays;
}

async function main() {
    console.log('Starting ConsultIQ database seed...\n');

    // --- Step 2: Role Definitions ---
    console.log('Seeding role definitions...');
    for (const role of Object.values(Role)) {
        await prisma.roleDefinition.upsert({
            where: { name: role },
            update: { description: ROLE_DESCRIPTIONS[role] },
            create: { name: role, description: ROLE_DESCRIPTIONS[role] },
        });
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
        process.env.BOOTSTRAP_CONSULTANT_EMAIL || 'alice.consultant@consultiq.dev',
        process.env.BOOTSTRAP_CONSULTANT_FULL_NAME || 'Alice Consultant',
        process.env.BOOTSTRAP_CONSULTANT_PASSWORD || 'SecureConsultantPass123!',
        Role.CONSULTANT
    );

    // --- COS301 Specific Users ---
    const baseCos301 = 'cos301queries@cs.up.ac.za';

    const cos301PmEmail = `pm-${baseCos301}`;
    const cos301PmUser = await seedUser(cos301PmEmail, 'COS301 Project Manager', 'rfbDqw@9RhHWVqtT', Role.PROJECT_MANAGER);

    const cos301CmEmail = `cm-${baseCos301}`;
    const cos301CmUser = await seedUser(cos301CmEmail, 'COS301 Consultant Manager', 'rfbDqw@9RhHWVqtT', Role.CONSULTANT_MANAGER);

    const cos301AdEmail = `ad-${baseCos301}`;
    const cos301AdUser = await seedUser(cos301AdEmail, 'COS301 Admin', 'rfbDqw@9RhHWVqtT', Role.ADMIN);

    const cos301CnEmail = `cn-${baseCos301}`;
    const cos301CnUser = await seedUser(cos301CnEmail, 'COS301 Consultant', 'rfbDqw@9RhHWVqtT', Role.CONSULTANT);

    // --- Step 5: Skills ---
    console.log('Seeding extended skills pool...');
    const skillRecords = await Promise.all(
        EXTENDED_SKILLS.map((skill) =>
            prisma.skill.upsert({
                where: { name: skill.name },
                update: { category: skill.category },
                create: { name: skill.name, category: skill.category },
            })
        )
    );

    // --- Step 6: Profiles for Alice & COS301 Consultant ---
    console.log('Seeding profiles for Alice and COS301 Consultant...');

    // 6a. Alice
    const aliceBirthDate = generateRandomDate(1990, 1998);
    const aliceLoc = SA_GEO_LOCATIONS[0];
    const aliceProfile = await prisma.consultant.upsert({
        where: { userId: consultantUser.id },
        update: {},
        create: {
            userId: consultantUser.id,
            addressLine1: aliceLoc.addressLine1,
            suburb: aliceLoc.suburb,
            city: aliceLoc.city,
            province: aliceLoc.province,
            postalCode: aliceLoc.postalCode,
            latitude: aliceLoc.latitude,
            longitude: aliceLoc.longitude,
            placeId: aliceLoc.placeId,
            formattedAddress: aliceLoc.formattedAddress,
            phone: '082 123 4567',
            idNumber: generateValidSAID(aliceBirthDate, false),
            nationality: 'South African',
            costToCompany: 8500.0,
            availability: ConsultantAvailability.AVAILABLE,
        },
    });

    await prisma.consultantManager.upsert({
        where: { userId_consultantId: { userId: cmUser.id, consultantId: aliceProfile.id } },
        update: {}, create: { userId: cmUser.id, consultantId: aliceProfile.id },
    });

    const aliceCvName = 'Alice_Consultant_CV_2026.pdf';
    await prisma.cvFile.create({
        data: {
            userId: consultantUser.id,
            consultantId: aliceProfile.id,
            fileName: aliceCvName,
            mimeType: 'application/pdf',
            fileSize: randomInt(150000, 3000000),
            s3Key: 'cv-uploads/' + consultantUser.id + '/' + aliceCvName,
            s3Url: 'https://consultiq-assets.s3.af-south-1.amazonaws.com/cv-uploads/' + consultantUser.id + '/' + aliceCvName,
            uploadStatus: UploadStatus.UPLOADED,
            extractionStatus: ExtractionStatus.COMPLETED,
            parsingMethod: CvParsingMethod.AI_ASSISTED,
            rawText: `Senior Data Engineer and AWS Architect. Graduated from University of Pretoria.`,
            parsedData: { skills: ["AWS", "Node.js", "Python"], education: ["University of Pretoria"], experience: ["Senior Backend Developer"] }
        }
    });

    // 6b. COS301 Consultant
    const cos301BirthDate = generateRandomDate(1995, 2000);
    const cos301Loc = SA_GEO_LOCATIONS[1];
    const cos301Profile = await prisma.consultant.upsert({
        where: { userId: cos301CnUser.id },
        update: {},
        create: {
            userId: cos301CnUser.id,
            addressLine1: cos301Loc.addressLine1,
            suburb: cos301Loc.suburb,
            city: cos301Loc.city,
            province: cos301Loc.province,
            postalCode: cos301Loc.postalCode,
            latitude: cos301Loc.latitude,
            longitude: cos301Loc.longitude,
            placeId: cos301Loc.placeId,
            formattedAddress: cos301Loc.formattedAddress,
            phone: '071 987 6543',
            idNumber: generateValidSAID(cos301BirthDate, true),
            nationality: 'South African',
            costToCompany: 4500.0, //Daily Rate (R 4,500/day)
            availability: ConsultantAvailability.AVAILABLE,
        },
    });

    await prisma.consultantManager.upsert({
        where: { userId_consultantId: { userId: cos301CmUser.id, consultantId: cos301Profile.id } },
        update: {}, create: { userId: cos301CmUser.id, consultantId: cos301Profile.id },
    });

    const cos301CvName = 'COS301_Consultant_CV.pdf';
    await prisma.cvFile.create({
        data: {
            userId: cos301CnUser.id,
            consultantId: cos301Profile.id,
            fileName: cos301CvName,
            mimeType: 'application/pdf',
            fileSize: randomInt(150000, 3000000),
            s3Key: 'cv-uploads/' + cos301CnUser.id + '/' + cos301CvName,
            s3Url: 'https://consultiq-assets.s3.af-south-1.amazonaws.com/cv-uploads/' + cos301CnUser.id + '/' + cos301CvName,
            uploadStatus: UploadStatus.UPLOADED,
            extractionStatus: ExtractionStatus.COMPLETED,
            parsingMethod: CvParsingMethod.AI_ASSISTED,
            rawText: `Junior Developer skilled in TypeScript and React.`,
            parsedData: { skills: ["TypeScript", "React"], education: ["University of Pretoria"], experience: ["Junior Developer"] }
        }
    });

    // --- Step 7: 100 Additional Consultants ---
    console.log('Generating 100 additional consultants with matching daily rates...');
    const generatedEmails = new Set();

    for (let i = 1; i <= 100; i++) {
        const firstName = randomItem(MOCK_DATA.firstNames);
        const lastName = randomItem(MOCK_DATA.lastNames);
        const fullName = firstName + ' ' + lastName;

        let email = firstName.toLowerCase() + '.' + lastName.toLowerCase() + '@consultiq.dev';
        let counter = 1;
        while (generatedEmails.has(email)) {
            email = firstName.toLowerCase() + '.' + lastName.toLowerCase() + counter + '@consultiq.dev';
            counter++;
        }
        generatedEmails.add(email);

        const loc = getRandomLocation();
        const birthDate = generateRandomDate(1985, 2000);
        const isMale = crypto.randomInt(0, 2) === 1;
        const validIdNumber = generateValidSAID(birthDate, isMale);

        const phonePrefix = randomItem(['071', '072', '073', '078', '079', '082', '083', '084']);
        const phoneNumber = phonePrefix + ' ' + String(randomInt(100, 999)) + ' ' + String(randomInt(1000, 9999));

        const cUser = await seedUser(email, fullName, 'SecureConsultantPass123!', Role.CONSULTANT);

        const cProfile = await prisma.consultant.upsert({
            where: { userId: cUser.id },
            update: {},
            create: {
                userId: cUser.id,
                addressLine1: loc.addressLine1,
                suburb: loc.suburb,
                city: loc.city,
                province: loc.province,
                postalCode: loc.postalCode,
                latitude: loc.latitude,
                longitude: loc.longitude,
                placeId: loc.placeId,
                formattedAddress: loc.formattedAddress,
                phone: phoneNumber,
                idNumber: validIdNumber,
                nationality: 'South African',
                costToCompany: randomInt(3000, 15000),
                availability: ConsultantAvailability.AVAILABLE,
            },
        });

        await prisma.consultantManager.upsert({
            where: { userId_consultantId: { userId: cmUser.id, consultantId: cProfile.id } },
            update: {},
            create: { userId: cmUser.id, consultantId: cProfile.id },
        });

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

        const existingEdu = await prisma.consultantEducation.findFirst({ where: { consultantId: cProfile.id } });
        let assignedEdu = existingEdu;
        if (!existingEdu) {
            assignedEdu = await prisma.consultantEducation.create({
                data: {
                    consultantId: cProfile.id,
                    institution: randomItem(MOCK_DATA.universities),
                    qualification: randomItem(MOCK_DATA.degrees),
                    startDate: new Date(`${randomInt(2010, 2018)}-01-15`),
                    endDate: new Date(`${randomInt(2014, 2021)}-11-30`),
                },
            });
        }

        const existingExp = await prisma.consultantExperience.findFirst({ where: { consultantId: cProfile.id } });
        let assignedExp = existingExp;
        if (!existingExp) {
            assignedExp = await prisma.consultantExperience.create({
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

        const fileName = `${firstName}_${lastName}_Resume.pdf`.replace(/\s+/g, '_');
        const existingCv = await prisma.cvFile.findFirst({ where: { consultantId: cProfile.id } });
        if (!existingCv) {
            await prisma.cvFile.create({
                data: {
                    userId: cUser.id,
                    consultantId: cProfile.id,
                    fileName: fileName,
                    mimeType: 'application/pdf',
                    fileSize: randomInt(200000, 4500000),
                    s3Key: 'cv-uploads/' + cUser.id + '/' + fileName,
                    s3Url: 'https://consultiq-assets.s3.af-south-1.amazonaws.com/cv-uploads/' + cUser.id + '/' + fileName,
                    uploadStatus: UploadStatus.UPLOADED,
                    extractionStatus: ExtractionStatus.COMPLETED,
                    parsingMethod: CvParsingMethod.AI_ASSISTED,
                    rawText: `Experienced ${assignedExp?.jobTitle} with a strong background in ${cSkills.map(s => s.name).join(', ')}. Holds a ${assignedEdu?.qualification} from ${assignedEdu?.institution}. Proven track record at ${assignedExp?.companyName}.`,
                    parsedData: {
                        skills: cSkills.map(s => s.name),
                        education: assignedEdu ? [assignedEdu.institution + ' - ' + assignedEdu.qualification] : [],
                        experience: assignedExp ? [assignedExp.jobTitle + ' at ' + assignedExp.companyName] : []
                    }
                }
            });
        }
    }

    // --- Step 8: Base Alice Project ---
    console.log('Seeding base project with aligned financial math...');
    const baseProjectLoc = SA_GEO_LOCATIONS[4];

    const baseStartDate = new Date('2026-08-01');
    const baseEndDate = new Date('2026-12-31');
    const baseWorkingDays = getWorkingDays(baseStartDate, baseEndDate);
    const baseTeamSize = 4;
    const baseTargetDailyRate = 9500;
    const baseCalculatedBudget = baseTargetDailyRate * baseWorkingDays * baseTeamSize;

    let baseProject = await prisma.project.findFirst({ where: { projectName: 'ConsultIQ Engine Upgrade' } });
    if (!baseProject) {
        baseProject = await prisma.project.create({
            data: {
                projectName: 'ConsultIQ Engine Upgrade',
                clientName: 'Internal R&D',
                addressLine1: baseProjectLoc.addressLine1,
                suburb: baseProjectLoc.suburb,
                city: baseProjectLoc.city,
                province: baseProjectLoc.province,
                postalCode: baseProjectLoc.postalCode,
                latitude: baseProjectLoc.latitude,
                longitude: baseProjectLoc.longitude,
                placeId: baseProjectLoc.placeId,
                formattedAddress: baseProjectLoc.formattedAddress,
                startDate: baseStartDate,
                endDate: baseEndDate,
                description: 'Upgrade the core engine of ConsultIQ to enhance performance and scalability.',
                teamSize: baseTeamSize,
                allocation: 100,
                budget: baseCalculatedBudget,
                status: ProjectStatus.OPEN,
            },
        });
    }

    await prisma.projectManager.upsert({
        where: { userId_projectId: { userId: pmUser.id, projectId: baseProject.id } },
        update: {}, create: { userId: pmUser.id, projectId: baseProject.id },
    });

    // --- Step 9: 20 Additional OPEN Projects ---
    console.log('Generating 20 additional OPEN projects with accurate geo-locations & budgets...');
    for (let i = 1; i <= 20; i++) {
        const projectName = randomItem(MOCK_DATA.projectPrefixes) + ' ' + randomItem(MOCK_DATA.projectSuffixes) + ' ' + i;
        const clientName = randomItem(MOCK_DATA.clients);
        const loc = getRandomLocation();

        let p = await prisma.project.findFirst({ where: { projectName } });

        if (!p) {
            const now = new Date('2026-09-30');
            const dayOffset = randomInt(-30, 7);
            const startDate = new Date(now);
            startDate.setDate(now.getDate() + dayOffset);

            const durationMonths = randomInt(2, 6);

            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + durationMonths);

            const workingDays = getWorkingDays(startDate, endDate);
            const teamSize = randomInt(2, 10);
            const targetDailyRate = randomInt(4000, 12000);
            const calculatedBudget = targetDailyRate * workingDays * teamSize;

            p = await prisma.project.create({
                data: {
                    projectName,
                    clientName,
                    description: `Strategic initiative to implement ${projectName} for ${clientName}.`,
                    addressLine1: loc.addressLine1,
                    suburb: loc.suburb,
                    city: loc.city,
                    province: loc.province,
                    postalCode: loc.postalCode,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    placeId: loc.placeId,
                    formattedAddress: loc.formattedAddress,
                    startDate: startDate,
                    endDate: endDate,
                    teamSize: teamSize,
                    allocation: randomItem([30, 50, 80, 100]),
                    budget: calculatedBudget,
                    status: ProjectStatus.OPEN,
                },
            });
        }

        await prisma.projectManager.upsert({
            where: { userId_projectId: { userId: pmUser.id, projectId: p.id } },
            update: {},
            create: { userId: pmUser.id, projectId: p.id },
        });

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
                    mandatory: randomItem([true, true, false]),
                },
            });
        }
    }

    // --- Step 10: Assign all seeded projects to the COS301 PM ---
    console.log(`\nLocating ${cos301PmEmail} to assign all generated projects...`);
    const allProjects = await prisma.project.findMany();
    let assignedCount = 0;

    for (const project of allProjects) {
        await prisma.projectManager.upsert({
            where: {
                userId_projectId: {
                    userId: cos301PmUser.id,
                    projectId: project.id,
                },
            },
            update: {},
            create: {
                userId: cos301PmUser.id,
                projectId: project.id,
            },
        });
        assignedCount++;
    }
    console.log(`Successfully linked ${assignedCount} projects to ${cos301PmEmail}!`);

    // --- Step 11: Public Holidays ---
    console.log('Seeding South African Public Holidays...');
    const seedYears = [2025, 2026, 2027];
    let holidayCount = 0;

    for (const year of seedYears) {
        const holidays = getSAHolidaysForYear(year);
        for (const holiday of holidays) {
            const existingHoliday = await prisma.publicHoliday.findFirst({
                where: { date: holiday.date }
            });

            if (existingHoliday) {
                await prisma.publicHoliday.update({
                    where: { id: existingHoliday.id },
                    data: { name: holiday.name }
                });
            } else {
                await prisma.publicHoliday.create({
                    data: { date: holiday.date, name: holiday.name }
                });
            }
            holidayCount++;
        }
    }
    console.log('Seeded ' + holidayCount + ' public holidays for years ' + seedYears.join(', ') + '.');

    // --- Step 12: Consultants without Profiles (Reserved Names) ---
    console.log('Seeding consultants with user accounts only (no consultant profiles)...');

    const unprofiledConsultants = [
        { fullName: 'Thabo Mokoena', email: 'thabo.mokoena84@gmail.com' },
        { fullName: 'Maria Slopes', email: 'mariaslopes@gmail.com' },
        { fullName: 'Thabo Nkosi', email: 'thabo.nkosi@example.com' },
        { fullName: 'Sipho Dlamini', email: 'sipho.dlamini@consultiq.dev' },
        { fullName: 'Lerato Khumalo', email: 'lerato.khumalo@consultiq.dev' },
        { fullName: 'Francois van der Merwe', email: 'francois.vdm@consultiq.dev' },
    ];

    for (const unprofiled of unprofiledConsultants) {
        await seedUser(
            unprofiled.email,
            unprofiled.fullName,
            'SecureConsultantPass123!',
            Role.CONSULTANT
        );
    }
    console.log(`Seeded ${unprofiledConsultants.length} consultants with user accounts only.`);

    // --- Summary ---
    const counts = {
        roles: await prisma.roleDefinition.count(),
        users: await prisma.user.count(),
        skills: await prisma.skill.count(),
        consultants: await prisma.consultant.count(),
        projects: await prisma.project.count(),
        cvs: await prisma.cvFile.count(),
        holidays: await prisma.publicHoliday.count(),
    };

    console.log('\n Seed process complete!');
    console.log('   Final database counts:');
    console.log(`   Roles       : ${counts.roles}`);
    console.log(`   Users       : ${counts.users}`);
    console.log(`   Skills      : ${counts.skills}`);
    console.log(`   Consultants : ${counts.consultants}`);
    console.log(`   Projects    : ${counts.projects}`);
    console.log(`   CV Files    : ${counts.cvs}`);
    console.log(`   Holidays    : ${counts.holidays}\n`);
}

main()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });