import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConsultantController } from './consultant.controller';
import { ConsultantService } from '../../consultants/services/consultant.service';
import { NotificationService } from '../../notification/service/notification.service';
import { Role } from '../../auth/enums/role.enum';
const mockConsultantService = {
  createConsultantProfile: jest.fn(),
  getPendingProfiles: jest.fn(),
  getAllConsultants: jest.fn(),
  getConsultantById: jest.fn(),
  getAssignedProjects: jest.fn(),
  updateConsultantProfile: jest.fn(),
  getAssignedProjectDetails: jest.fn(),
  uploadProfilePicture: jest.fn(),
  getConsultantsByProject: jest.fn(),
  unassignConsultant: jest.fn(),
  getConsultantByUserId: jest.fn(),
};

const mockNotificationService = {
  sendPushNotification: jest.fn(),
};

describe('ConsultantController', () => {
  let controller: ConsultantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsultantController],
      providers: [
        { provide: ConsultantService, useValue: mockConsultantService },
        { provide: NotificationService, useValue: mockNotificationService },
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

      const result = await controller.getPendingProfiles();
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
    });

    it('should return empty array when no pending profiles', async () => {
      mockConsultantService.getPendingProfiles.mockResolvedValue([]);
      const result = await controller.getPendingProfiles();
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

  // - getConsultantByUserId ---------------

  describe('getConsultantByUserId', () => {
    it('should throw ForbiddenException if a consultant requests another user profile', () => {
      const req = { user: { role: Role.CONSULTANT, userId: 'user-123' } };

      expect(() => {
        controller.getConsultantByUserId('user-999', req as any);
      }).toThrow(ForbiddenException);

      expect(mockConsultantService.getConsultantByUserId).not.toHaveBeenCalled();
    });

    it('should allow a consultant to view their own profile', async () => {
      const req = { user: { role: Role.CONSULTANT, userId: 'user-123' } };
      const mockProfile = { id: 'consultant-1', userId: 'user-123' };
      mockConsultantService.getConsultantByUserId.mockResolvedValue(mockProfile);

      const result = await controller.getConsultantByUserId('user-123', req as any);

      expect(result).toEqual(mockProfile);
      expect(mockConsultantService.getConsultantByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should allow other roles (e.g. CONSULTANT_MANAGERS) to view any user profile', async () => {
      const req = { user: { role: Role.CONSULTANT_MANAGER, userId: 'manager-1' } };
      const mockProfile = { id: 'consultant-2', userId: 'user-999' };
      mockConsultantService.getConsultantByUserId.mockResolvedValue(mockProfile);

      const result = await controller.getConsultantByUserId('user-999', req as any);

      expect(result).toEqual(mockProfile);
      expect(mockConsultantService.getConsultantByUserId).toHaveBeenCalledWith('user-999');
    });
  });

  // ─── getAssignedProjects ────────────────────────────────────────────────────
  describe('getAssignedProjects', () => {
    it('should call service with userId from JWT and return result', async () => {
      const mockProjects = [
        {
          placementId: 'placement-1',
          PlacementStatus: 'ACTIVE',
          placementAllocation: 80,
          startDate: new Date('2026-01-01'),
          endDate: null,
          project: {
            projectName: 'Project Alpha',
            clientName: 'Client A',
            teamMembers: [],
          },
        },
      ];
      mockConsultantService.getAssignedProjects.mockResolvedValue(mockProjects);

      const req = { user: { userId: 'user-123' } };
      const result = await controller.getAssignedProjects(req as any);

      expect(result).toEqual(mockProjects);
      expect(mockConsultantService.getAssignedProjects).toHaveBeenCalledWith('user-123');
    });

    it('should propagate NotFoundException when consultant has no profile', async () => {
      mockConsultantService.getAssignedProjects.mockRejectedValue(
        new NotFoundException('No consultant profile for this user.'),
      );

      const req = { user: { userId: 'unknown-user' } };
      await expect(controller.getAssignedProjects(req as any)).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when consultant has no placements', async () => {
      mockConsultantService.getAssignedProjects.mockResolvedValue([]);

      const req = { user: { userId: 'user-123' } };
      const result = await controller.getAssignedProjects(req as any);

      expect(result).toEqual([]);
      expect(mockConsultantService.getAssignedProjects).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateConsultantProfile', () => {
    it('should call service with correct id and dto and return result', async () => {
      mockConsultantService.updateConsultantProfile.mockResolvedValue({
        message: 'Consultant profile updated successfully.',
      });

      const dto = { phone: '0821234567', nationality: 'South African' };
      const req = { user: { userId: 'consultant-user-1', role: 'CONSULTANT' } };
      const result = await controller.updateConsultantProfile('consultant-uuid-1', req as any, dto as any);

      expect(mockConsultantService.updateConsultantProfile).toHaveBeenCalledWith(
        'consultant-uuid-1',
        dto,
        'CONSULTANT',
        'consultant-user-1',
      );
      expect(result.message).toBe('Consultant profile updated successfully.');
    });

    it('should propagate NotFoundException from service', async () => {
      mockConsultantService.updateConsultantProfile.mockRejectedValue(
        new NotFoundException('Consultant with id uuid-999 not found.'),
      );

      const req = { user: { userId: 'consultant-user-1', role: 'CONSULTANT' } };
      await expect(
        controller.updateConsultantProfile('uuid-999', req as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAssignedProjectDetails', () => {
    it('should call service with userId and projectId and return result', async () => {
      const mockDetails = {
        placementId: 'placement-1',
        placementStatus: 'ACTIVE',
        placementAllocation: 80,
        startDate: new Date('2026-01-01'),
        endDate: null,
        project: {
          projectName: 'Project Alpha',
          skills: [],
          teamMembers: [],
        },
      };
      mockConsultantService.getAssignedProjectDetails.mockResolvedValue(mockDetails);

      const req = { user: { userId: 'user-123' } };
      const result = await controller.getAssignedProjectDetails('project-1', req as any);

      expect(result).toEqual(mockDetails);
      expect(mockConsultantService.getAssignedProjectDetails).toHaveBeenCalledWith('user-123', 'project-1');
    });

    it('should propagate NotFoundException when consultant is not assigned to project', async () => {
      mockConsultantService.getAssignedProjectDetails.mockRejectedValue(
        new NotFoundException('You are not assigned to project with ID project-999.'),
      );

      const req = { user: { userId: 'user-123' } };
      await expect(
        controller.getAssignedProjectDetails('project-999', req as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- uploadProfilePicture------------
  describe('uploadProfilePicture', () => {
    const mockFile = {
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('fake-image-data'),
    } as Express.Multer.File;

    it('should throw BadRequestException if no file is provided', async () => {
      const req = { user: { userId: 'user-123' } };
      await expect(
        controller.uploadProfilePicture('consultant-1', undefined as any, req as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockConsultantService.uploadProfilePicture).not.toHaveBeenCalled();
    });

    it('should call service with consultantId, userId from JWT, and file', async () => {
      mockConsultantService.uploadProfilePicture.mockResolvedValue({
        pictureUrl: 'https://bucket.s3.region.amazonaws.com/profile-pictures/consultant-1/photo.jpg',
        message: 'Profile picture uploaded successfully.',
      });

      const req = { user: { userId: 'user-123', role: 'CONSULTANT' } };
      const result = await controller.uploadProfilePicture('consultant-1', mockFile, req as any);

      expect(mockConsultantService.uploadProfilePicture).toHaveBeenCalledWith(
        'consultant-1',
        'user-123',
        'CONSULTANT',
        mockFile,
      );
      expect(result.message).toBe('Profile picture uploaded successfully.');
    });

    it('should propagate ForbiddenException from service', async () => {
      mockConsultantService.uploadProfilePicture.mockRejectedValue(
        new Error('You can only update your own profile picture.'),
      );

      const req = { user: { userId: 'user-123' } };
      await expect(
        controller.uploadProfilePicture('consultant-1', mockFile, req as any),
      ).rejects.toThrow('You can only update your own profile picture.');
    });
  });


  // ---------- getConsultantsByProject ----------

  describe('getConsultantsByProject', () => {
    it('should successfully return consultants for a project', async () => {
      const mockResponse = { projectId: 'project-123', totalPlacements: 1, consultants: [] };
      mockConsultantService.getConsultantsByProject.mockResolvedValue(mockResponse);

      const req = { user: { role: 'ADMIN' } };
      const result = await controller.getConsultantsByProject('project-123', req);

      expect(result).toEqual(mockResponse);
      expect(mockConsultantService.getConsultantsByProject).toHaveBeenCalledWith(
        'project-123',
        'ADMIN',
      );
    });

    it('should pass PROJECT_MANAGER role to the service correctly', async () => {
      const mockResponse = { projectId: 'project-123', totalPlacements: 1, consultants: [] };
      mockConsultantService.getConsultantsByProject.mockResolvedValue(mockResponse);

      const req = { user: { role: 'PROJECT_MANAGER' } };
      const result = await controller.getConsultantsByProject('project-123', req);

      expect(result).toEqual(mockResponse);
      expect(mockConsultantService.getConsultantsByProject).toHaveBeenCalledWith(
        'project-123',
        'PROJECT_MANAGER',
      );
    });

    it('should throw an exception when the user role is missing from the request', async () => {
      const req = { user: {} };

      await expect(controller.getConsultantsByProject('project-123', req))
        .rejects.toThrow(BadRequestException);
      expect(mockConsultantService.getConsultantsByProject).not.toHaveBeenCalled();
    });

    it('should throw an exception when the request user object is entirely undefined', async () => {
      const req = {};

      await expect(controller.getConsultantsByProject('project-123', req))
        .rejects.toThrow(BadRequestException);

      expect(mockConsultantService.getConsultantsByProject).not.toHaveBeenCalled();
    });

  });
  // ─── unassignConsultant ─────────────────────────────────────────────────────

  describe('unassignConsultant', () => {
    it('should call the service with correct parameters and return the result', async () => {
      const mockResponse = {
        message: 'Consultant successfully unassigned and capacity restored.',
        placementId: 'placement-123',
      };

      mockConsultantService.unassignConsultant.mockResolvedValue(mockResponse);

      const result = await controller.unassignConsultant('project-1', 'consultant-1');

      expect(result).toEqual(mockResponse);
      expect(mockConsultantService.unassignConsultant).toHaveBeenCalledWith(
        'project-1',
        'consultant-1',
      );
    });

    it('should correctly throw exceptions thrown by the service (NotFoundException)', async () => {
      mockConsultantService.unassignConsultant.mockRejectedValue(
        new NotFoundException('Active placement not found'),
      );

      await expect(
        controller.unassignConsultant('project-1', 'consultant-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockConsultantService.unassignConsultant).toHaveBeenCalledWith(
        'project-1',
        'consultant-1',
      );
    });
  });
});