import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConsultantController } from './consultant.controller';
import { ConsultantService } from '../../consultants/services/consultant.service';

const mockConsultantService = {
  createConsultantProfile: jest.fn(),
  getPendingProfiles: jest.fn(),
  getAllConsultants: jest.fn(),
  getConsultantById: jest.fn(),
};

describe('ConsultantController', () => {
  let controller: ConsultantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsultantController],
      providers: [
        { provide: ConsultantService, useValue: mockConsultantService },
      ],
    }).compile();

    controller = module.get<ConsultantController>(ConsultantController);
    jest.clearAllMocks();
  });

  // ─── createProfile ──────────────────────────────────────────────────────────

  describe('createProfile', () => {
    it('should call service with cmUserId from JWT and return result', async () => {
      mockConsultantService.createConsultantProfile.mockResolvedValue({
        message: 'Consultant profile created successfully.',
        consultantId: 'uuid-123',
      });

      const req = { user: { userId: 'cm-uuid-123' } };
      const dto = { consultantUserId: 'consultant-uuid-123' };

      const result = await controller.createProfile(dto as any, req as any);
      expect(result.message).toBe('Consultant profile created successfully.');
      expect(result.consultantId).toBe('uuid-123');
      expect(mockConsultantService.createConsultantProfile).toHaveBeenCalledWith('cm-uuid-123', dto);
    });

    it('should propagate errors from service', async () => {
      mockConsultantService.createConsultantProfile.mockRejectedValue(new Error('Conflict'));
      const req = { user: { userId: 'cm-uuid-123' } };
      await expect(controller.createProfile({} as any, req as any)).rejects.toThrow('Conflict');
    });
  });

  // ─── getPendingProfiles ─────────────────────────────────────────────────────

  describe('getPendingProfiles', () => {
    it('should return list of pending profile users', async () => {
      const mockPending = [
        { userId: 'user-1', fullName: 'Jane Doe', email: 'jane@consultiq.com', createdAt: new Date() },
      ];
      mockConsultantService.getPendingProfiles.mockResolvedValue(mockPending);

      const result = await controller.getPendingProfiles({} as any);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
    });

    it('should return empty array when no pending profiles', async () => {
      mockConsultantService.getPendingProfiles.mockResolvedValue([]);
      const result = await controller.getPendingProfiles({} as any);
      expect(result).toHaveLength(0);
    });
  });

  // ─── getAllConsultants ──────────────────────────────────────────────────────

  describe('getAllConsultants', () => {
    it('should return paginated consultants with correct role', async () => {
      const mockResponse = { page: 1, total: 0, consultants: [] };
      mockConsultantService.getAllConsultants.mockResolvedValue(mockResponse);

      const req = { user: { role: 'CONSULTANT_MANAGER' } };
      const result = await controller.getAllConsultants('1', '10', req);
      expect(result).toEqual(mockResponse);
      expect(mockConsultantService.getAllConsultants).toHaveBeenCalledWith(1, 10, 'CONSULTANT_MANAGER');
    });

    it('should default to PROJECT_MANAGER when no user on request', async () => {
      mockConsultantService.getAllConsultants.mockResolvedValue({ page: 1, total: 0, consultants: [] });
      await controller.getAllConsultants('1', '10', {});
      expect(mockConsultantService.getAllConsultants).toHaveBeenCalledWith(1, 10, 'PROJECT_MANAGER');
    });

    it('should parse page and limit as integers', async () => {
      mockConsultantService.getAllConsultants.mockResolvedValue({ page: 3, total: 30, consultants: [] });
      const req = { user: { role: 'ADMIN' } };
      await controller.getAllConsultants('3', '5', req);
      expect(mockConsultantService.getAllConsultants).toHaveBeenCalledWith(3, 5, 'ADMIN');
    });
  });

  // ─── getConsultantById ──────────────────────────────────────────────────────

  describe('getConsultantById', () => {
    it('should return a consultant profile by id', async () => {
      const mockProfile = {
        id: 'uuid-1', fullName: 'Jane Smith', email: 'jane@consultiq.com',
        location: 'Johannesburg', availability: 'AVAILABLE', skills: [], experience: [], certificates: [],
      };
      mockConsultantService.getConsultantById.mockResolvedValue(mockProfile);

      const result = await controller.getConsultantById('uuid-1');
      expect(result).toEqual(mockProfile);
      expect(mockConsultantService.getConsultantById).toHaveBeenCalledWith('uuid-1');
    });

    it('should propagate NotFoundException from service', async () => {
      mockConsultantService.getConsultantById.mockRejectedValue(
        new NotFoundException('Consultant with id uuid-999 not found.'),
      );
      await expect(controller.getConsultantById('uuid-999')).rejects.toThrow(NotFoundException);
    });
  });
});