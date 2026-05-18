/**
 * @file seed.ts
 * @description TASK-30 — Seeds ConsultIQ with:
 *   1. All permissions (granular actions across the four architecture layers)
 *   2. All four RoleDefinition records with descriptions
 *   3. Permission assignments per role
 *   4. A bootstrap ADMIN user (configured via env vars)
 *
 * Idempotent — uses upsert throughout, safe to run on every deployment.
 *
 * Run:
 *   npx prisma db seed
 *   npx ts-node prisma/seed.ts
 *
 * Required env vars (see .env.example):
 *   DATABASE_URL
 *   BOOTSTRAP_ADMIN_EMAIL       (optional — defaults to admin@consultiq.dev)
 *   BOOTSTRAP_ADMIN_PASSWORD    (optional — defaults to a placeholder; change immediately)
 *   BOOTSTRAP_ADMIN_FULL_NAME   (optional — defaults to "System Administrator")
 */

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// =============================================================================
// 1. Permission definitions
// Format: "<resource>:<action>"
//
// Resources map to the four ConsultIQ architecture layers:
//   consultant_profile → Consultant Profile Management layer
//   scoring            → Scoring Engine layer
//   placement          → Placement Dashboard layer
//   cv                 → CV Parsing layer
//   ctc                → Cost-to-Company data (restricted from PROJECT_MANAGER)
//   user               → User / admin management
//   audit              → Audit log access
// =============================================================================

const PERMISSIONS: { name: string; description: string }[] = [
    //  Consultant Profile Management 
    { name: 'consultant_profile:read', description: 'View consultant profiles' },
    { name: 'consultant_profile:create', description: 'Create a new consultant profile' },
    { name: 'consultant_profile:update', description: 'Edit an existing consultant profile' },
    { name: 'consultant_profile:delete', description: 'Delete a consultant profile' },

    //  Scoring Engine 
    { name: 'scoring:read', description: 'View consultant scores and evaluations' },
    { name: 'scoring:write', description: 'Run or update scoring evaluations' },

    //  Placement Dashboard 
    { name: 'placement:read', description: 'View placement dashboard and records' },
    { name: 'placement:create', description: 'Create a new placement record' },
    { name: 'placement:update', description: 'Update an existing placement record' },
    { name: 'placement:delete', description: 'Delete a placement record' },

    //  CV Parsing 
    { name: 'cv:upload', description: 'Upload a CV for parsing' },
    { name: 'cv:read', description: 'View parsed CV data' },
    { name: 'cv:delete', description: 'Delete a parsed CV record' },

    //  Cost-to-Company (explicitly restricted from PROJECT_MANAGER) 
    { name: 'ctc:read', description: 'View cost-to-company financial data' },
    { name: 'ctc:write', description: 'Edit cost-to-company financial data' },

    //  User Management (admin-only) 
    { name: 'user:read', description: 'View user accounts' },
    { name: 'user:create', description: 'Create new user accounts' },
    { name: 'user:update', description: 'Update user accounts' },
    { name: 'user:delete', description: 'Delete user accounts' },
    { name: 'user:assign_role', description: 'Assign or change roles for users' },
    { name: 'user:suspend', description: 'Suspend or unlock user accounts' },
    { name: 'user:unlock', description: 'Suspend or unlock user accounts' },



    //  Audit Log 
    { name: 'audit:read', description: 'View authentication and system audit logs' },
];

// =============================================================================
// 2. Role → Permission mappings
// =============================================================================

const ROLE_PERMISSIONS: Record<Role, string[]> = {

    // ADMIN — unrestricted access to everything
    [Role.ADMIN]: PERMISSIONS.map((p) => p.name),

    // PROJECT_MANAGER — broad operational access, NO cost-to-company data (TASK-33)
    [Role.PROJECT_MANAGER]: [
        'consultant_profile:read',
        'scoring:read',
        'placement:read',
        'placement:create',
        'placement:update',
        'cv:read',
        'audit:read',
        // ctc:read and ctc:write intentionally excluded
    ],

    // CONSULTANT_MANAGER — manages consultants, scoring, CV data, and CTC
    [Role.CONSULTANT_MANAGER]: [
        'consultant_profile:read',
        'consultant_profile:create',
        'consultant_profile:update',
        'scoring:read',
        'scoring:write',
        'placement:read',
        'cv:upload',
        'cv:read',
        'cv:delete',
        'ctc:read',
    ],

    // CONSULTANT — self-service access to own profile and scores
    [Role.CONSULTANT]: [
        'consultant_profile:read',
        'scoring:read',
        'placement:read',
        //'cv:upload',
        'cv:read',
    ],
};

// =============================================================================
// 3. Role descriptions
// =============================================================================

const ROLE_DESCRIPTIONS: Record<Role, string> = {
    [Role.ADMIN]:
        'Full system access. Manages users, roles, permissions, and all data.',
    [Role.PROJECT_MANAGER]:
        'Manages placements and dashboards. No access to cost-to-company data.',
    [Role.CONSULTANT_MANAGER]:
        'Manages consultant profiles, scoring, CV parsing, and cost-to-company data.',
    [Role.CONSULTANT]:
        'Self-service access to own profile, scores, and placements.',
};

// =============================================================================
// Seed
// =============================================================================

async function main() {
    console.log('🌱  Starting ConsultIQ database seed...\n');

    //  Step 1: Permissions 
    console.log('📋  Seeding permissions...');

    for (const permission of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: { description: permission.description },
            create: { name: permission.name, description: permission.description },
        });
    }

    console.log(`    ✓ ${PERMISSIONS.length} permissions upserted\n`);

    //  Step 2: Role definitions ─
    console.log('🎭  Seeding role definitions...');

    for (const role of Object.values(Role)) {
        await prisma.roleDefinition.upsert({
            where: { name: role },
            update: { description: ROLE_DESCRIPTIONS[role] },
            create: { name: role, description: ROLE_DESCRIPTIONS[role] },
        });
    }

    console.log(`    ✓ ${Object.values(Role).length} roles upserted\n`);

    //  Step 3: Assign permissions to roles ─
    console.log('🔗  Assigning permissions to roles...');

    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
        const roleRecord = await prisma.roleDefinition.findUnique({
            where: { name: roleName as Role },
        });

        if (!roleRecord) {
            console.warn(`    ⚠  Role "${roleName}" not found — skipping`);
            continue;
        }

        let assigned = 0;

        for (const permissionName of permissionNames) {
            const permissionRecord = await prisma.permission.findUnique({
                where: { name: permissionName },
            });

            if (!permissionRecord) {
                console.warn(`    ⚠  Permission "${permissionName}" not found — skipping`);
                continue;
            }

            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId: roleRecord.id,
                        permissionId: permissionRecord.id,
                    },
                },
                update: {},
                create: {
                    roleId: roleRecord.id,
                    permissionId: permissionRecord.id,
                },
            });

            assigned++;
        }

        console.log(`    ✓ ${roleName}: ${assigned} permission(s) assigned`);
    }

    console.log();

    //  Step 4: Bootstrap admin user (TASK-30) 
    console.log('👤  Seeding bootstrap admin user...');

    const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@consultiq.dev';
    const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin@ConsultIQ2025!';
    const adminName = process.env.BOOTSTRAP_ADMIN_FULL_NAME ?? 'System Administrator';

    if (!process.env.BOOTSTRAP_ADMIN_PASSWORD) {
        console.warn(
            '\n    ⚠  BOOTSTRAP_ADMIN_PASSWORD is not set in your environment.\n' +
            '       A default password has been used.\n' +
            '       Change it immediately after first login!\n',
        );
    }

    // Fetch the ADMIN role record to link via roleId FK
    const adminRoleRecord = await prisma.roleDefinition.findUnique({
        where: { name: Role.ADMIN },
    });

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            role: Role.ADMIN,
            roleId: adminRoleRecord?.id,
            status: UserStatus.ACTIVE,
        },
        create: {
            fullName: adminName,
            email: adminEmail,
            passwordHash: passwordHash,
            role: Role.ADMIN,
            roleId: adminRoleRecord?.id,
            status: UserStatus.ACTIVE,
            failedAttempts: 0,
            isLocked: false,
        },
    });

    console.log(`    ✓ Admin user ready : ${adminUser.email}`);
    console.log(`    ✓ Full name        : ${adminUser.fullName}`);
    console.log(`    ✓ Role             : ${adminUser.role}`);
    console.log(`    ✓ Status           : ${adminUser.status}\n`);

    //  Summary 
    const counts = {
        permissions: await prisma.permission.count(),
        roles: await prisma.roleDefinition.count(),
        rolePermissions: await prisma.rolePermission.count(),
        users: await prisma.user.count(),
    };

    console.log('✅  Seed complete!\n');
    console.log('📊  Database summary:');
    console.log(`    Permissions      : ${counts.permissions}`);
    console.log(`    Roles            : ${counts.roles}`);
    console.log(`    Role→Permissions : ${counts.rolePermissions}`);
    console.log(`    Users            : ${counts.users}`);
}

main()
    .catch((error: unknown) => {
        console.error('❌  Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });