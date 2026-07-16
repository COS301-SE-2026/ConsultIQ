import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Role } from '../../auth/enums/role.enum';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  adminAuditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('assignRole', () => {
    const performedById = 'admin-uuid';
    const targetUserId = 'target-uuid';

    it('should throw BadRequestException if admin tries to change their own role', async () => {
      await expect(
        service.assignRole('same-uuid', { role: Role.CONSULTANT }, 'same-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(
        service.assignRole(targetUserId, { role: Role.CONSULTANT }, performedById),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user already has the target role', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: targetUserId,
        fullName: 'Test User',
        email: 'test@consultiq.com',
        role: Role.CONSULTANT,
      });

      await expect(
        service.assignRole(targetUserId, { role: Role.CONSULTANT }, performedById),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if target user is a SUPER_ADMIN', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: targetUserId,
        fullName: 'Super Admin',
        email: 'super@consultiq.com',
        role: Role.SUPER_ADMIN,
      });

      await expect(
        service.assignRole(targetUserId, { role: Role.ADMIN }, performedById),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update role and create audit log in a transaction', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: targetUserId,
        fullName: 'Jane Smith',
        email: 'jane@consultiq.com',
        role: Role.CONSULTANT,
      });

      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.assignRole(
        targetUserId,
        { role: Role.CONSULTANT_MANAGER },
        performedById,
      );

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(result.message).toContain(targetUserId);
    });

    it('should include both operations in the transaction', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: targetUserId,
        fullName: 'Jane Smith',
        email: 'jane@consultiq.com',
        role: Role.CONSULTANT,
      });

      mockPrismaService.$transaction.mockImplementation(
        async (operations: any[]) => Promise.all(operations),
      );

      await service.assignRole(
        targetUserId,
        { role: Role.PROJECT_MANAGER },
        performedById,
      );

      const transactionCall = mockPrismaService.$transaction.mock.calls[0][0];
      expect(transactionCall).toHaveLength(2);
    });
  });
});