import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@1234', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      fullName: 'Test Admin',
      email: 'admin@test.com',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      failedAttempts: 0,
      isLocked: false,
    },
  });

  console.log('Admin user created:', user.email);
  console.log('Password: Admin@1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
  