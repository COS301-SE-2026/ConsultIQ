import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { fieldEncryptionExtension } from 'prisma-field-encryption';
import { migrate } from './encryption-migrations';

async function main() {
  const client = new PrismaClient().$extends(fieldEncryptionExtension());
  const report = await migrate(client as any); // cast needed — migrate() expects the base PrismaClient type, extended client's type differs
  console.log('Migration complete:', report);
  await client.$disconnect();
}

main().catch((e) => {
  console.error(e);
  throw e;
});