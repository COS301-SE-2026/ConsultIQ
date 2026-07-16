import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from '../../admin/services/admin.service';
import { Role } from '../../auth/enums/role.enum';

const mockAdminService = {
  assignRole: jest.fn(),
};

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    jest.clearAllMocks();
  });

  describe('assignRole', () => {
    it('should call service with correct arguments and return result', async () => {
      mockAdminService.assignRole.mockResolvedValue({
        message: 'Role of user target-uuid changed from CONSULTANT to CONSULTANT_MANAGER successfully.',
      });

      const req = { user: { userId: 'admin-uuid' } };
      const dto = { role: Role.CONSULTANT_MANAGER };

      const result = await controller.assignRole('target-uuid', dto, req);

      expect(mockAdminService.assignRole).toHaveBeenCalledWith(
        'target-uuid',
        dto,
        'admin-uuid',
      );
      expect(result.message).toContain('target-uuid');
    });

    it('should propagate errors from service', async () => {
      mockAdminService.assignRole.mockRejectedValue(new Error('Not found'));
      const req = { user: { userId: 'admin-uuid' } };

      await expect(
        controller.assignRole('target-uuid', { role: Role.CONSULTANT }, req),
      ).rejects.toThrow('Not found');
    });
  });
  
});