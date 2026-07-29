import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminUserService } from './admin.user.service';
import { cleanDatabase } from '../../../../prisma/prisma-test-utils';
import { AdminModule } from '../../admin.module';

describe('AdminUserService - Integration Test', () => {
  let service: AdminUserService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AdminModule],
    }).compile();

    service = moduleRef.get<AdminUserService>(AdminUserService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  //---------getAllUsers------------
  describe('getAllUsers', () => {
    it('returns only non-admin, non-archived users', async () => {
      await prisma.user.createMany({
        data: [
          { email: 'admin@test.com', fullName: 'Admin User', role: 'ADMIN' },
          {
            email: 'pm@test.com',
            fullName: 'Project Manager',
            role: 'PROJECT_MANAGER',
            status: 'ACTIVE',
          },
          {
            email: 'consultant@test.com',
            fullName: 'Consultant User',
            role: 'CONSULTANT',
            status: 'ACTIVE',
          },
          {
            email: 'archived@test.com',
            fullName: 'Archived User',
            role: 'CONSULTANT',
            status: 'ARCHIVED',
            deletedAt: new Date(),
          },
        ],
      });

      const result = await service.getAllUsers(1, 10);

      expect(result.data.length).toBe(2);
      expect(result.data.every((u) => u.role !== 'ADMIN')).toBe(true);
      expect(result.data.every((u) => u.status !== 'ARCHIVED')).toBe(true);
      expect(result.meta.totalRecords).toBe(2);
    });

    it('returns correct activeUsers and suspendedUsers counts', async () => {
      await prisma.user.createMany({
        data: [
          {
            email: 'active1@test.com',
            fullName: 'Active One',
            role: 'CONSULTANT',
            status: 'ACTIVE',
          },
          {
            email: 'active2@test.com',
            fullName: 'Active Two',
            role: 'PROJECT_MANAGER',
            status: 'ACTIVE',
          },
          {
            email: 'suspended@test.com',
            fullName: 'Suspended One',
            role: 'CONSULTANT',
            status: 'SUSPENDED',
          },
        ],
      });

      const result = await service.getAllUsers(1, 10);

      expect(result.meta.activeUsers).toBe(2);
      expect(result.meta.suspendedUsers).toBe(1);
      expect(result.meta.totalRecords).toBe(3);
    });

    it('paginate correct', async () => {
      await prisma.user.createMany({
        data: Array.from({ length: 15 }, (_, i) => ({
          email: `user${i}@test.com`,
          fullName: `User ${i}`,
          role: 'CONSULTANT' as const,
          status: 'ACTIVE' as const,
        })),
      });

      const result = await service.getAllUsers(1, 5);

      expect(result.data.length).toBe(5);
      expect(result.meta.totalRecords).toBe(15);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.currentPage).toBe(1);
    });

    it('returns empty array when no non-admin users exist', async () => {
      await prisma.user.create({
        data: {
          email: 'admin@test.com',
          fullName: 'Admin Only',
          role: 'ADMIN',
        },
      });

      const result = await service.getAllUsers(1, 10);

      expect(result.data.length).toBe(0);
      expect(result.meta.totalRecords).toBe(0);
    });
  });

  // ---------suspendUser---------
  describe('suspendUser', () => {
    it('succussfully suspened an active user', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'active@test.com',
          fullName: 'Active User',
          role: 'CONSULTANT',
          status: 'ACTIVE',
        },
      });

      const result = await service.suspendUser(user.id);

      expect(result.message).toBe('User suspended successfully');

      const updated = await prisma.user.findUnique({ where: { id: user.id } });

      expect(updated?.status).toBe('SUSPENDED');
    });

    it('throws NotFoundException when user does not exist', async () => {
      await expect(
        service.suspendUser('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  //---------activateUser------------
  describe('activateUser', () => {
    it('successfully activates a suspended user', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'suspended@test.com',
          fullName: 'Suspended User',
          role: 'CONSULTANT',
          status: 'SUSPENDED',
        },
      });

      const result = await service.activateUser(user.id);

      expect(result.message).toBe('User activated successfully');

      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated?.status).toBe('ACTIVE');
    });

    it('throws NotFoundException when user does not exist', async () => {
      await expect(
        service.activateUser('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
