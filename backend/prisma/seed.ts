/**
 * @file seed.ts
 * @description Seeds ConsultIQ with:
 *   1. Role definitions
 *   2. Bootstrap Admin & Reserved Users (PM, CM, Consultant, COS301 accounts)
 *   3. Categorized Skills
 *   4. Completed Consultant Profiles (Alice & COS301 Consultant)
 *   5. 100 generated Consultants with valid SA IDs & accurate geo-coordinates
 *   6. A base project plus 20 generated Projects with aligned budgets
 *   7. Assignment of all seeded projects to the COS301 Project Manager
 *   8. Public Holidays (South Africa)
 *   9. Consultant user accounts without profiles
 */

import {
    PrismaClient,
    Prisma,
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
import * as crypto from 'node:crypto';

const prisma = new PrismaClient();

// =============================================================================
// 1. Data Generators & Constants
// =============================================================================

const BATCH_SIZE = 10;
const GENERATED_CONSULTANT_COUNT = 100;
const GENERATED_PROJECT_COUNT = 20;
const DEFAULT_CONSULTANT_PASSWORD = 'SecureConsultantPass123!';
const COS301_PASSWORD = 'rfbDqw@9RhHWVqtT';
const BASE_COS301_EMAIL = 'cos301queries@cs.up.ac.za';

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

type GeoLocation = (typeof SA_GEO_LOCATIONS)[number];
type Skill = { id: string; name: string };
type PublicHolidayEntry = { date: Date; name: string };

const roleIds = new Map<Role, string>();

// =============================================================================
// Helper Functions
// =============================================================================

const randomItem = <T>(arr: T[]): T => arr[crypto.randomInt(0, arr.length)];
const randomInt = (min: number, max: number): number => crypto.randomInt(min, max + 1);
const getRandomLocation = (): GeoLocation => randomItem(SA_GEO_LOCATIONS);

const randomSample = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
};

async function runInBatches<T>(
    items: T[],
    worker: (item: T) => Promise<unknown>,
    batchSize: number = BATCH_SIZE,
): Promise<void> {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    await batches.reduce<Promise<void>>(
        (chain, batch) => chain.then(() => Promise.all(batch.map(worker))).then(() => undefined),
        Promise.resolve(),
    );
}

function locationFields(loc: GeoLocation) {
    return {
        addressLine1: loc.addressLine1,
        suburb: loc.suburb,
        city: loc.city,
        province: loc.province,
        postalCode: loc.postalCode,
        latitude: loc.latitude,
        longitude: loc.longitude,
        placeId: loc.placeId,
        formattedAddress: loc.formattedAddress,
    };
}

// Valid South African ID Generator
function generateValidSAID(birthDate: Date, isMale: boolean): string {
    const yy = String(birthDate.getFullYear()).slice(-2);
    const mm = String(birthDate.getMonth() + 1).padStart(2, '0');
    const dd = String(birthDate.getDate()).padStart(2, '0');

    const ssss = String(crypto.randomInt(isMale ? 5000 : 0, isMale ? 9999 : 4999)).padStart(4, '0');
    const baseId = yy + mm + dd + ssss + '08';

    let sum = 0;
    for (let i = 0; i < baseId.length; i++) {
        let digit = Number.parseInt(baseId.charAt(i), 10);
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
    const start = new Date(startYear, 0, 1).getTime();
    const end = new Date(endYear, 11, 31).getTime();
    return new Date(start + crypto.randomInt(0, end - start));
}

function randomPhone(): string {
    const prefix = randomItem(['071', '072', '073', '078', '079', '082', '083', '084']);
    return `${prefix} ${randomInt(100, 999)} ${randomInt(1000, 9999)}`;
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

function getObservedDate(holidayDate: Date): Date {
    const substitute = new Date(holidayDate);
    const isChristmas = holidayDate.getUTCMonth() === 11 && holidayDate.getUTCDate() === 25;
    substitute.setUTCDate(substitute.getUTCDate() + (isChristmas ? 2 : 1));
    return substitute;
}

function getSAHolidaysForYear(year: number): PublicHolidayEntry[] {
    const baseHolidays: PublicHolidayEntry[] = [
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
    const familyDay = new Date(easter);
    familyDay.setUTCDate(easter.getUTCDate() + 1);
    baseHolidays.push({ date: goodFriday, name: "Good Friday" }, { date: familyDay, name: "Family Day" });

    const sundayObservances = baseHolidays
        .filter((h) => h.date.getUTCDay() === 0)
        .map((h) => ({ date: getObservedDate(h.date), name: `${h.name} (Observed)` }));

    return [...baseHolidays, ...sundayObservances];
}

// =============================================================================
// 2. Seed Steps
// =============================================================================

async function seedRoleDefinitions(): Promise<void> {
    console.log('Seeding role definitions...');
    const records = await Promise.all(
        Object.values(Role).map((role) =>
            prisma.roleDefinition.upsert({
                where: { name: role },
                update: { description: ROLE_DESCRIPTIONS[role] },
                create: { name: role, description: ROLE_DESCRIPTIONS[role] },
            })
        )
    );
    for (const record of records) {
        roleIds.set(record.name as Role, record.id);
    }
}

async function seedUser(email: string, fullName: string, plainPassword: string, roleEnum: Role) {
    const roleId = roleIds.get(roleEnum);
    const passwordHash = await bcrypt.hash(plainPassword, 12);
    return prisma.user.upsert({
        where: { email },
        update: { fullName, role: roleEnum, roleId, status: UserStatus.ACTIVE },
        create: {
            email, fullName, passwordHash, role: roleEnum, roleId,
            status: UserStatus.ACTIVE, failedAttempts: 0, isLocked: false,
        },
    });
}

async function seedReservedUsers() {
    console.log('Seeding reserved user accounts...');

    const [adminUser, pmUser, cmUser, consultantUser] = await Promise.all([
        seedUser(
            process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@consultiq.dev',
            process.env.BOOTSTRAP_ADMIN_FULL_NAME || 'System Administrator',
            process.env.BOOTSTRAP_ADMIN_PASSWORD || 'SecureAdminPass123!',
            Role.ADMIN
        ),
        seedUser(
            process.env.BOOTSTRAP_PM_EMAIL || 'pm@consultiq.dev',
            process.env.BOOTSTRAP_PM_FULL_NAME || 'Jane Project',
            process.env.BOOTSTRAP_PM_PASSWORD || 'SecurePMPass123!',
            Role.PROJECT_MANAGER
        ),
        seedUser(
            process.env.BOOTSTRAP_CM_EMAIL || 'cm@consultiq.dev',
            process.env.BOOTSTRAP_CM_FULL_NAME || 'John Manager',
            process.env.BOOTSTRAP_CM_PASSWORD || 'SecureCMPass123!',
            Role.CONSULTANT_MANAGER
        ),
        seedUser(
            process.env.BOOTSTRAP_CONSULTANT_EMAIL || 'alice.consultant@consultiq.dev',
            process.env.BOOTSTRAP_CONSULTANT_FULL_NAME || 'Alice Consultant',
            process.env.BOOTSTRAP_CONSULTANT_PASSWORD || 'SecureConsultantPass123!',
            Role.CONSULTANT
        ),
    ]);

    // COS301 specific users
    const [cos301PmUser, cos301CmUser, , cos301CnUser] = await Promise.all([
        seedUser(`pm-${BASE_COS301_EMAIL}`, 'COS301 Project Manager', COS301_PASSWORD, Role.PROJECT_MANAGER),
        seedUser(`cm-${BASE_COS301_EMAIL}`, 'COS301 Consultant Manager', COS301_PASSWORD, Role.CONSULTANT_MANAGER),
        seedUser(`ad-${BASE_COS301_EMAIL}`, 'COS301 Admin', COS301_PASSWORD, Role.ADMIN),
        seedUser(`cn-${BASE_COS301_EMAIL}`, 'COS301 Consultant', COS301_PASSWORD, Role.CONSULTANT),
    ]);

    return { adminUser, pmUser, cmUser, consultantUser, cos301PmUser, cos301CmUser, cos301CnUser };
}

async function seedSkills(): Promise<Skill[]> {
    console.log('Seeding extended skills pool...');
    return Promise.all(
        EXTENDED_SKILLS.map((skill) =>
            prisma.skill.upsert({
                where: { name: skill.name },
                update: { category: skill.category },
                create: { name: skill.name, category: skill.category },
            })
        )
    );
}

interface CvInput {
    userId: string;
    consultantId: string;
    fileName: string;
    minSize: number;
    maxSize: number;
    rawText: string;
    parsedData: Prisma.InputJsonValue;
}

function createCvFile(input: CvInput) {
    const { userId, consultantId, fileName, minSize, maxSize, rawText, parsedData } = input;
    const s3Key = `cv-uploads/${userId}/${fileName}`;
    return prisma.cvFile.create({
        data: {
            userId,
            consultantId,
            fileName,
            mimeType: 'application/pdf',
            fileSize: randomInt(minSize, maxSize),
            s3Key,
            s3Url: `https://consultiq-assets.s3.af-south-1.amazonaws.com/${s3Key}`,
            uploadStatus: UploadStatus.UPLOADED,
            extractionStatus: ExtractionStatus.COMPLETED,
            parsingMethod: CvParsingMethod.AI_ASSISTED,
            rawText,
            parsedData,
        },
    });
}

function linkConsultantToManager(managerUserId: string, consultantId: string) {
    return prisma.consultantManager.upsert({
        where: { userId_consultantId: { userId: managerUserId, consultantId } },
        update: {},
        create: { userId: managerUserId, consultantId },
    });
}

interface FixedConsultantInput {
    userId: string;
    managerUserId: string;
    location: GeoLocation;
    birthDate: Date;
    isMale: boolean;
    phone: string;
    costToCompany: number;
    cvFileName: string;
    cvRawText: string;
    cvParsedData: Prisma.InputJsonValue;
}

async function seedFixedConsultant(input: FixedConsultantInput): Promise<void> {
    const profile = await prisma.consultant.upsert({
        where: { userId: input.userId },
        update: {},
        create: {
            userId: input.userId,
            ...locationFields(input.location),
            phone: input.phone,
            idNumber: generateValidSAID(input.birthDate, input.isMale),
            nationality: 'South African',
            costToCompany: input.costToCompany,
            availability: ConsultantAvailability.AVAILABLE,
        },
    });

    await linkConsultantToManager(input.managerUserId, profile.id);
    await createCvFile({
        userId: input.userId,
        consultantId: profile.id,
        fileName: input.cvFileName,
        minSize: 150000,
        maxSize: 3000000,
        rawText: input.cvRawText,
        parsedData: input.cvParsedData,
    });
}

async function seedFixedConsultants(
    users: Awaited<ReturnType<typeof seedReservedUsers>>,
): Promise<void> {
    console.log('Seeding profiles for Alice and COS301 Consultant...');

    await seedFixedConsultant({
        userId: users.consultantUser.id,
        managerUserId: users.cmUser.id,
        location: SA_GEO_LOCATIONS[0],
        birthDate: generateRandomDate(1990, 1998),
        isMale: false,
        phone: '082 123 4567',
        costToCompany: 8500,
        cvFileName: 'Alice_Consultant_CV_2026.pdf',
        cvRawText: 'Senior Data Engineer and AWS Architect. Graduated from University of Pretoria.',
        cvParsedData: {
            skills: ["AWS", "Node.js", "Python"],
            education: ["University of Pretoria"],
            experience: ["Senior Backend Developer"],
        },
    });

    await seedFixedConsultant({
        userId: users.cos301CnUser.id,
        managerUserId: users.cos301CmUser.id,
        location: SA_GEO_LOCATIONS[1],
        birthDate: generateRandomDate(1995, 2000),
        isMale: true,
        phone: '071 987 6543',
        costToCompany: 4500,
        cvFileName: 'COS301_Consultant_CV.pdf',
        cvRawText: 'Junior Developer skilled in TypeScript and React.',
        cvParsedData: {
            skills: ["TypeScript", "React"],
            education: ["University of Pretoria"],
            experience: ["Junior Developer"],
        },
    });
}

// --- Generated consultants ---

interface ConsultantIdentity {
    firstName: string;
    lastName: string;
    email: string;
}

function buildConsultantIdentities(count: number): ConsultantIdentity[] {
    const usedEmails = new Set<string>();
    return Array.from({ length: count }, () => {
        const firstName = randomItem(MOCK_DATA.firstNames);
        const lastName = randomItem(MOCK_DATA.lastNames);
        const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;

        let email = `${base}@consultiq.dev`;
        let counter = 1;
        while (usedEmails.has(email)) {
            email = `${base}${counter}@consultiq.dev`;
            counter++;
        }
        usedEmails.add(email);

        return { firstName, lastName, email };
    });
}

async function ensureEducation(consultantId: string) {
    const existing = await prisma.consultantEducation.findFirst({ where: { consultantId } });
    if (existing) return existing;

    return prisma.consultantEducation.create({
        data: {
            consultantId,
            institution: randomItem(MOCK_DATA.universities),
            qualification: randomItem(MOCK_DATA.degrees),
            startDate: new Date(`${randomInt(2010, 2018)}-01-15`),
            endDate: new Date(`${randomInt(2014, 2021)}-11-30`),
        },
    });
}

async function ensureExperience(consultantId: string) {
    const existing = await prisma.consultantExperience.findFirst({ where: { consultantId } });
    if (existing) return existing;

    return prisma.consultantExperience.create({
        data: {
            consultantId,
            jobTitle: randomItem(MOCK_DATA.jobTitles),
            companyName: randomItem(MOCK_DATA.companies),
            jobType: JobType.FULL_TIME,
            workModel: randomItem(Object.values(WorkModel)),
            startDate: new Date(`${randomInt(2018, 2022)}-02-01`),
            description: 'Worked on scalable infrastructure and core product features.',
        },
    });
}

function assignConsultantSkill(consultantId: string, skillId: string) {
    return prisma.consultantSkill.upsert({
        where: { consultantId_skillId: { consultantId, skillId } },
        update: {},
        create: {
            consultantId,
            skillId,
            competencyLevel: randomItem(Object.values(CompetencyLevel)),
            yearsExperience: randomInt(1, 10),
            confidenceLevel: randomInt(5, 10),
        },
    });
}

async function ensureGeneratedCv(
    userId: string,
    consultantId: string,
    identity: ConsultantIdentity,
    skills: Skill[],
    education: { institution: string; qualification: string },
    experience: { jobTitle: string; companyName: string },
): Promise<void> {
    const existing = await prisma.cvFile.findFirst({ where: { consultantId } });
    if (existing) return;

    const fileName = `${identity.firstName}_${identity.lastName}_Resume.pdf`.replace(/\s+/g, '_');
    const skillNames = skills.map((s) => s.name);

    await createCvFile({
        userId,
        consultantId,
        fileName,
        minSize: 200000,
        maxSize: 4500000,
        rawText: `Experienced ${experience.jobTitle} with a strong background in ${skillNames.join(', ')}. Holds a ${education.qualification} from ${education.institution}. Proven track record at ${experience.companyName}.`,
        parsedData: {
            skills: skillNames,
            education: [`${education.institution} - ${education.qualification}`],
            experience: [`${experience.jobTitle} at ${experience.companyName}`],
        },
    });
}

async function seedGeneratedConsultant(
    identity: ConsultantIdentity,
    cmUserId: string,
    skillRecords: Skill[],
): Promise<void> {
    const fullName = `${identity.firstName} ${identity.lastName}`;
    const cUser = await seedUser(identity.email, fullName, DEFAULT_CONSULTANT_PASSWORD, Role.CONSULTANT);

    const cProfile = await prisma.consultant.upsert({
        where: { userId: cUser.id },
        update: {},
        create: {
            userId: cUser.id,
            ...locationFields(getRandomLocation()),
            phone: randomPhone(),
            idNumber: generateValidSAID(generateRandomDate(1985, 2000), crypto.randomInt(0, 2) === 1),
            nationality: 'South African',
            costToCompany: randomInt(3000, 15000),
            availability: ConsultantAvailability.AVAILABLE,
        },
    });

    const cSkills = randomSample(skillRecords, randomInt(2, 5));
    const [education, experience] = await Promise.all([
        ensureEducation(cProfile.id),
        ensureExperience(cProfile.id),
        linkConsultantToManager(cmUserId, cProfile.id),
        ...cSkills.map((skill) => assignConsultantSkill(cProfile.id, skill.id)),
    ]);

    await ensureGeneratedCv(cUser.id, cProfile.id, identity, cSkills, education, experience);
}

async function seedGeneratedConsultants(cmUserId: string, skillRecords: Skill[]): Promise<void> {
    console.log(`Generating ${GENERATED_CONSULTANT_COUNT} additional consultants with matching daily rates...`);
    const identities = buildConsultantIdentities(GENERATED_CONSULTANT_COUNT);
    await runInBatches(identities, (identity) => seedGeneratedConsultant(identity, cmUserId, skillRecords));
}

// --- Projects ---

function linkProjectToManager(userId: string, projectId: string) {
    return prisma.projectManager.upsert({
        where: { userId_projectId: { userId, projectId } },
        update: {},
        create: { userId, projectId },
    });
}

async function seedBaseProject(pmUserId: string): Promise<void> {
    console.log('Seeding base project with aligned financial math...');

    const startDate = new Date('2026-08-01');
    const endDate = new Date('2026-12-31');
    const teamSize = 4;
    const targetDailyRate = 9500;
    const budget = targetDailyRate * getWorkingDays(startDate, endDate) * teamSize;

    const existing = await prisma.project.findFirst({ where: { projectName: 'ConsultIQ Engine Upgrade' } });
    const baseProject = existing ?? await prisma.project.create({
        data: {
            projectName: 'ConsultIQ Engine Upgrade',
            clientName: 'Internal R&D',
            ...locationFields(SA_GEO_LOCATIONS[4]),
            startDate,
            endDate,
            description: 'Upgrade the core engine of ConsultIQ to enhance performance and scalability.',
            teamSize,
            allocation: 100,
            budget,
            status: ProjectStatus.OPEN,
        },
    });

    await linkProjectToManager(pmUserId, baseProject.id);
}

function buildGeneratedProjectData(projectName: string): Prisma.ProjectCreateInput {
    const clientName = randomItem(MOCK_DATA.clients);

    const startDate = new Date('2026-09-30');
    startDate.setDate(startDate.getDate() + randomInt(-30, 7));

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + randomInt(2, 6));

    const teamSize = randomInt(2, 10);
    const targetDailyRate = randomInt(4000, 12000);

    return {
        projectName,
        clientName,
        description: `Strategic initiative to implement ${projectName} for ${clientName}.`,
        ...locationFields(getRandomLocation()),
        startDate,
        endDate,
        teamSize,
        allocation: randomItem([30, 50, 80, 100]),
        budget: targetDailyRate * getWorkingDays(startDate, endDate) * teamSize,
        status: ProjectStatus.OPEN,
    };
}

function assignProjectSkill(projectId: string, skillId: string) {
    return prisma.projectSkill.upsert({
        where: { projectId_skillId: { projectId, skillId } },
        update: {},
        create: {
            projectId,
            skillId,
            competency: randomItem(Object.values(CompetencyLevel)),
            years: randomInt(1, 5),
            mandatory: randomItem([true, true, false]),
        },
    });
}

async function seedGeneratedProject(index: number, pmUserId: string, skillRecords: Skill[]): Promise<void> {
    const projectName = `${randomItem(MOCK_DATA.projectPrefixes)} ${randomItem(MOCK_DATA.projectSuffixes)} ${index}`;

    const existing = await prisma.project.findFirst({ where: { projectName } });
    const project = existing ?? await prisma.project.create({ data: buildGeneratedProjectData(projectName) });

    const pSkills = randomSample(skillRecords, randomInt(1, 4));
    await Promise.all([
        linkProjectToManager(pmUserId, project.id),
        ...pSkills.map((skill) => assignProjectSkill(project.id, skill.id)),
    ]);
}

async function seedGeneratedProjects(pmUserId: string, skillRecords: Skill[]): Promise<void> {
    console.log(`Generating ${GENERATED_PROJECT_COUNT} additional OPEN projects with accurate geo-locations & budgets...`);
    const indexes = Array.from({ length: GENERATED_PROJECT_COUNT }, (_, i) => i + 1);
    await runInBatches(indexes, (index) => seedGeneratedProject(index, pmUserId, skillRecords));
}

async function assignAllProjectsToCos301Pm(cos301PmUserId: string): Promise<void> {
    console.log(`\nLocating ${`pm-${BASE_COS301_EMAIL}`} to assign all generated projects...`);
    const allProjects = await prisma.project.findMany();
    await runInBatches(allProjects, (project) => linkProjectToManager(cos301PmUserId, project.id));
    console.log(`Successfully linked ${allProjects.length} projects to pm-${BASE_COS301_EMAIL}!`);
}

// --- Public holidays ---

async function upsertHoliday(holiday: PublicHolidayEntry): Promise<void> {
    const existing = await prisma.publicHoliday.findFirst({ where: { date: holiday.date } });
    if (existing) {
        await prisma.publicHoliday.update({ where: { id: existing.id }, data: { name: holiday.name } });
    } else {
        await prisma.publicHoliday.create({ data: { date: holiday.date, name: holiday.name } });
    }
}

async function seedPublicHolidays(): Promise<void> {
    console.log('Seeding South African Public Holidays...');
    const seedYears = [2025, 2026, 2027];

    // De-duplicate by date (later entries win) so concurrent upserts can never race on the same date.
    const byDate = new Map<number, PublicHolidayEntry>();
    for (const holiday of seedYears.flatMap(getSAHolidaysForYear)) {
        byDate.set(holiday.date.getTime(), holiday);
    }
    const holidays = [...byDate.values()];

    await runInBatches(holidays, upsertHoliday);
    console.log(`Seeded ${holidays.length} public holidays for years ${seedYears.join(', ')}.`);
}

// --- Consultants without profiles ---

async function seedUnprofiledConsultants(): Promise<void> {
    console.log('Seeding consultants with user accounts only (no consultant profiles)...');

    const unprofiledConsultants = [
        { fullName: 'Thabo Mokoena', email: 'thabo.mokoena84@gmail.com' },
        { fullName: 'Maria Slopes', email: 'mariaslopes@gmail.com' },
        { fullName: 'Thabo Nkosi', email: 'thabo.nkosi@example.com' },
        { fullName: 'Sipho Dlamini', email: 'sipho.dlamini@consultiq.dev' },
        { fullName: 'Lerato Khumalo', email: 'lerato.khumalo@consultiq.dev' },
        { fullName: 'Francois van der Merwe', email: 'francois.vdm@consultiq.dev' },
    ];

    await Promise.all(
        unprofiledConsultants.map((c) =>
            seedUser(c.email, c.fullName, DEFAULT_CONSULTANT_PASSWORD, Role.CONSULTANT)
        )
    );
    console.log(`Seeded ${unprofiledConsultants.length} consultants with user accounts only.`);
}

// --- Summary ---

async function printSummary(): Promise<void> {
    const [roles, users, skills, consultants, projects, cvs, holidays] = await Promise.all([
        prisma.roleDefinition.count(),
        prisma.user.count(),
        prisma.skill.count(),
        prisma.consultant.count(),
        prisma.project.count(),
        prisma.cvFile.count(),
        prisma.publicHoliday.count(),
    ]);

    console.log('\n Seed process complete!');
    console.log('   Final database counts:');
    console.log(`   Roles       : ${roles}`);
    console.log(`   Users       : ${users}`);
    console.log(`   Skills      : ${skills}`);
    console.log(`   Consultants : ${consultants}`);
    console.log(`   Projects    : ${projects}`);
    console.log(`   CV Files    : ${cvs}`);
    console.log(`   Holidays    : ${holidays}\n`);
}

// =============================================================================
// 3. Entry Point
// =============================================================================

async function main(): Promise<void> {
    console.log('Starting ConsultIQ database seed...\n');

    await seedRoleDefinitions();
    const users = await seedReservedUsers();
    const skillRecords = await seedSkills();

    await seedFixedConsultants(users);
    await seedGeneratedConsultants(users.cmUser.id, skillRecords);

    await seedBaseProject(users.pmUser.id);
    await seedGeneratedProjects(users.pmUser.id, skillRecords);
    await assignAllProjectsToCos301Pm(users.cos301PmUser.id);

    await seedPublicHolidays();
    await seedUnprofiledConsultants();
    await printSummary();
}

main()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });