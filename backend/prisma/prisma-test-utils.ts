import { PrismaClient } from "@prisma/client/extension";

export async function cleanDatabase(prisma: PrismaClient) {

    // get all table names from schema
    const tableNames = await prisma.$queryRaw < Array<{ tableName: string }>>
        `SELECT tableName FROM pg_tables WHERE schemaname='public'`;

    //filter out schema migrations table
    const tables = tableNames
        .map(({ tableName }) => tableName)
        .filter((name) => name !== '_prisma_migrations')
        .map((name) => `"public"."${name}"`)
        .join(',');

    if (tables.length > 0) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
}