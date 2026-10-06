import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PlacementService } from './placement.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlacementStatus, AuditAction } from '@prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { NotificationService } from '../../notification/service/notification.service';

const mockPrismaService = {
  projectManager: {
    findUnique: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
  },
  consultant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  projectPlacement: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(async (callback) => callback(mockPrismaService)),
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockNotificationService = {
  createAndSendNotification: jest.fn(),
};

type MockProject = {
  id: string;
  teamSize: number;
  endDate?: Date;
  budget?: number;
};

type MockConsultant = {
  id: string;
  capacity: number;
  availability?: string;
  costToCompany?: number;
  userId?: string;
};

const DEFAULT_PROJECT: MockProject = {
  id: 'project-1',
  teamSize: 10,
  endDate: new Date('2026-12-01'),
  budget: 1_000_000,
};

const DEFAULT_CONSULTANT: MockConsultant = {
  id: 'consultant-1',
  capacity: 100,
  costToCompany: 100,
  userId: 'consultant-user-1',
};

interface PlacementMockOptions {
  isManager?: boolean;
  project?: MockProject | null;
  consultant?: MockConsultant | null;
  existingPlacement?: object | null;
  activePlacementCount?: number;
}

function setupPlacementMocks({
  isManager = true,
  project = DEFAULT_PROJECT,
  consultant = DEFAULT_CONSULTANT,
  existingPlacement = null,
  activePlacementCount = 0,
}: PlacementMockOptions = {}) {
  mockPrismaService.projectManager.findUnique.mockResolvedValue(
    isManager ? { userId: 'user-123', projectId: 'project-1' } : null,
  );
  mockPrismaService.project.findUnique.mockResolvedValue(project);
  mockPrismaService.consultant.findUnique.mockResolvedValue(consultant);
  mockPrismaService.projectPlacement.findFirst.mockResolvedValue(existingPlacement);
  mockPrismaService.projectPlacement.count.mockResolvedValue(activePlacementCount);
}

describe('PlacementService', () => {
  let service: PlacementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlacementService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<PlacementService>(PlacementService);

    jest.clearAllMocks();
    mockPrismaService.projectPlacement.count.mockResolvedValue(0);
    mockPrismaService.projectPlacement.findMany.mockResolvedValue([]);
  });

  describe('createPlacement', () => {
    const dto = {
      consultantId: 'consultant-1',
      startDate: '2026-06-01',
      endDate: '2026-12-01',
      allocation: 50,
    };

    it('should throw ForbiddenException if the user is not the assigned Project Manager', async () => {
      mockPrismaService.projectManager.findUnique.mockResolvedValue(null);

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrismaService.project.findUnique).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if neither the placement DTO nor the project has an end date', async () => {

      setupPlacementMocks({
        project: {
          id: 'project-1',
          teamSize: 10,
          budget: 1_000_000,

        } as any,
      });

      const dtoWithoutEndDate = {
        consultantId: 'consultant-1',
        startDate: '2026-06-01',
        allocation: 50,

      };

      await expect(
        service.createPlacement('project-1', dtoWithoutEndDate, 'user-123'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createPlacement('project-1', dtoWithoutEndDate, 'user-123'),
      ).rejects.toThrow('A project or placement end date is required to calculate budget feasibility.');

      expect(mockPrismaService.projectPlacement.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if the consultant is missing a costToCompany value', async () => {
      setupPlacementMocks({
        consultant: {
          id: 'consultant-1',
          capacity: 100,
          userId: 'consultant-user-1',
          costToCompany: null,
        } as any,
      });

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow('Consultant Cost To Company is required for budget calculation.');

      expect(mockPrismaService.projectPlacement.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if the project does not exist', async () => {
      mockPrismaService.projectManager.findUnique.mockResolvedValue({
        userId: 'user-123',
        projectId: 'project-1',
      });

      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.consultant.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if the consultant does not exist', async () => {
      mockPrismaService.projectManager.findUnique.mockResolvedValue({
        userId: 'user-123',
        projectId: 'project-1',
      });

      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-1',
        teamSize: 10,
        endDate: new Date('2026-12-01'),
        budget: 1_000_000,
      });

      mockPrismaService.consultant.findUnique.mockResolvedValue(null);

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.projectPlacement.findFirst).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if the consultant is already placed on the project', async () => {
      setupPlacementMocks({
        existingPlacement: {
          id: 'placement-1',
          projectId: 'project-1',
          consultantId: 'consultant-1',
        },
      });

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.projectPlacement.create).not.toHaveBeenCalled();
    });

    it('should ignore terminated placement history when checking for duplicates', async () => {
      setupPlacementMocks({
        consultant: { ...DEFAULT_CONSULTANT, availability: 'AVAILABLE' },
      });

      mockPrismaService.consultant.update.mockResolvedValue({
        id: 'consultant-1',
        capacity: 50,
        availability: 'AVAILABLE',
      });
      mockPrismaService.projectPlacement.create.mockResolvedValue({ id: 'placement-2' });

      await service.createPlacement('project-1', dto, 'user-123');

      expect(mockPrismaService.projectPlacement.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 'project-1',
          consultantId: 'consultant-1',
          status: PlacementStatus.ACTIVE,
        },
      });
      expect(mockPrismaService.projectPlacement.create).toHaveBeenCalled();
    });


    it('should throw BadRequestException if the end date is before the start date', async () => {
      const invalidDto = {
        ...dto,
        startDate: '2026-12-01',
        endDate: '2026-06-01',
      };

      mockPrismaService.projectManager.findUnique.mockResolvedValue({
        userId: 'user-123',
        projectId: 'project-1',
      });

      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-1',
        teamSize: 10,
      });

      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: 'consultant-1',
      });

      mockPrismaService.projectPlacement.findFirst.mockResolvedValue(null);

      await expect(
        service.createPlacement('project-1', invalidDto, 'user-123'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.projectPlacement.findMany).not.toHaveBeenCalled();
      expect(mockPrismaService.projectPlacement.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if the requested allocation exceeds remaining capacity', async () => {
      mockPrismaService.projectManager.findUnique.mockResolvedValue({
        userId: 'user-123',
        projectId: 'project-1',
      });

      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-1',
        teamSize: 10,
      });

      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: 'consultant-1',
        capacity: 40,
      });

      mockPrismaService.projectPlacement.findFirst.mockResolvedValue(null);

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.projectPlacement.create).not.toHaveBeenCalled();
    });

    it('should create a placement successfully when there is enough capacity', async () => {
      setupPlacementMocks();

      mockPrismaService.consultant.update.mockResolvedValue({
        id: 'consultant-1',
        capacity: 50,
        availability: 'AVAILABLE',
      });

      mockPrismaService.projectPlacement.create.mockResolvedValue({
        id: 'placement-1',
      });

      const result = await service.createPlacement(
        'project-1',
        dto,
        'user-123',
      );

      expect(mockPrismaService.consultant.update).toHaveBeenCalledWith({
        where: { id: 'consultant-1' },
        data: {
          capacity: { decrement: 50 },
        },
      })

      expect(mockPrismaService.projectPlacement.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-1',
          consultantId: 'consultant-1',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-12-01'),
          allocation: 50,
          status: PlacementStatus.ACTIVE,
        },
      });

      expect(result).toEqual({
        message: 'Placement created successfully.',
        placementId: 'placement-1',
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' },
      );
    });

    it('should reject a placement that exceeds the project budget', async () => {
      setupPlacementMocks({
        project: {
          id: 'project-1',
          teamSize: 10,
          endDate: new Date('2026-12-01'),
          budget: 9_000,
        },
        consultant: {
          id: 'consultant-1',
          capacity: 100,
          costToCompany: 100,
          userId: 'consultant-user-1',
        },
      });

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.projectPlacement.create).not.toHaveBeenCalled();
      expect(mockPrismaService.consultant.update).not.toHaveBeenCalled();
    });

    it('should allow a placement when projected cost exactly equals the budget', async () => {
      setupPlacementMocks({
        project: {
          id: 'project-1',
          teamSize: 10,
          endDate: new Date('2026-12-01'),
          budget: 9_150,
        },
        consultant: {
          id: 'consultant-1',
          capacity: 100,
          costToCompany: 100,
          userId: 'consultant-user-1',
        },
      });
      mockPrismaService.consultant.update.mockResolvedValue({
        id: 'consultant-1',
        capacity: 50,
        availability: 'AVAILABLE',
      });
      mockPrismaService.projectPlacement.create.mockResolvedValue({
        id: 'placement-budget-boundary',
      });

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).resolves.toEqual({
        message: 'Placement created successfully.',
        placementId: 'placement-budget-boundary',
      });
    });

    it('should include existing active placement spend in the budget check', async () => {
      setupPlacementMocks({
        project: {
          id: 'project-1',
          teamSize: 10,
          endDate: new Date('2026-12-01'),
          budget: 10_000,
        },
        consultant: {
          id: 'consultant-1',
          capacity: 100,
          costToCompany: 100,
          userId: 'consultant-user-1',
        },
      });
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([
        {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-02-01'),
          allocation: 100,
          consultant: { costToCompany: 100 },
          project: { endDate: new Date('2026-12-01') },
        },
      ]);

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.projectPlacement.create).not.toHaveBeenCalled();
    });

    it('should allow a placement when the requested allocation exactly matches remaining capacity', async () => {
      setupPlacementMocks({
        consultant: { ...DEFAULT_CONSULTANT, capacity: 50 },
      });

      mockPrismaService.consultant.update.mockResolvedValue({
        id: 'consultant-1',
        capacity: 0,
        availability: 'UNAVAILABLE',
      });
      mockPrismaService.projectPlacement.create.mockResolvedValue({ id: 'placement-2' });

      const result = await service.createPlacement('project-1', dto, 'user-123');

      expect(result).toEqual({
        message: 'Placement created successfully.',
        placementId: 'placement-2',
      });
    });

    it('should update availability when the consultant availabitlity changes after placement creation', async () => {
      const validDto = {
        consultantId: 'consultant-1',
        startDate: '2026-06-01',
        endDate: '2026-12-31',
        allocation: 100,
      };

      mockPrismaService.projectManager.findUnique.mockResolvedValue({
        userId: 'user-123',
        projectId: 'project-1',
      });

      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-1',
        teamSize: 10,
        endDate: new Date('2026-12-31'),
        budget: 1_000_000,
      });

      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: 'consultant-1',
        capacity: 100,
        availability: 'AVAILABLE',
        costToCompany: 100,
      });

      mockPrismaService.projectPlacement.findFirst.mockResolvedValue(null);

      mockPrismaService.consultant.update.mockResolvedValueOnce({
        id: 'consultant-1',
        capacity: 0,
        availability: 'AVAILABLE',
      }).mockResolvedValueOnce({
        id: 'consultant-1',
        capacity: 0,
        availability: 'UNAVAILABLE',
      });

      mockPrismaService.projectPlacement.create.mockResolvedValue({ id: 'placement-3', });

      await service.createPlacement('project-1', validDto, 'user-123');

      expect(mockPrismaService.consultant.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'consultant-1' },
        data: { capacity: { decrement: 100 } },
      });

      expect(mockPrismaService.consultant.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'consultant-1' },
        data: { availability: 'UNAVAILABLE' },
      });
    });

    it('writes an audit log entry after successfully creating a placement', async () => {
      setupPlacementMocks();
      mockPrismaService.consultant.update.mockResolvedValue({
        id: 'consultant-1', capacity: 50, availability: 'AVAILABLE'
      });

      mockPrismaService.projectPlacement.create.mockResolvedValue({ id: 'placement-1' });


      await service.createPlacement('project-1', dto, 'user-123');

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: AuditAction.PLACEMENT_CREATED,
        actingUserId: 'user-123',
        entityType: 'Placement',
        entityId: 'placement-1',
        metadata: {
          projectId: 'project-1',
          consultantId: 'consultant-1',
          allocation: 50,
        },
      });
    });

    it('does not write an audit log entry when placement creation fails validation', async () => {
      mockPrismaService.projectManager.findUnique.mockResolvedValue(null);

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockAuditLogService.log).not.toHaveBeenCalled();
    });
    ///////////////////

    it('should throw ConflictException when the project has reached its team size limit', async () => {
      setupPlacementMocks({ project: { id: 'project-1', teamSize: 3 }, activePlacementCount: 3 });

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.projectPlacement.create).not.toHaveBeenCalled();
    });

    it('should allow a placement when the team is under its size limit', async () => {
      setupPlacementMocks({ project: { id: 'project-1', teamSize: 100 }, activePlacementCount: 2 });
      mockPrismaService.consultant.update.mockResolvedValue({
        id: 'consultant-1',
        capacity: 50,
        availability: 'AVAILABLE',
      });

      mockPrismaService.projectPlacement.create.mockResolvedValue({
        id: 'placement-1',
      });

      const result = await service.createPlacement('project-1', dto, 'user-123');

      expect(mockPrismaService.projectPlacement.create).toHaveBeenCalled();
      expect(result.message).toEqual('Placement created successfully.');
    });

    it('should allow a placement that fills the very last available team slot', async () => {
      setupPlacementMocks({ project: { id: 'project-1', teamSize: 3 }, activePlacementCount: 2 });
      mockPrismaService.projectPlacement.create.mockResolvedValue({
        id: 'consultant-1',
        capacity: 50,
        availability: 'AVAILABLE',
      });
      mockPrismaService.projectPlacement.create.mockResolvedValue({
        id: 'placement-1',
      });

      const result = await service.createPlacement('project-1', dto, 'user-123');

      expect(mockPrismaService.projectPlacement.create).toHaveBeenCalled();
      expect(result.message).toBe('Placement created successfully.');
    });

    it('checks the team size limit using only ACTIVE placements', async () => {
      setupPlacementMocks({ project: { id: 'project-1', teamSize: 3 }, activePlacementCount: 0 });

      await service.createPlacement('project-1', dto, 'user-123');

      expect(mockPrismaService.projectPlacement.count).toHaveBeenCalledWith({
        where: { projectId: 'project-1', status: PlacementStatus.ACTIVE },
      });
    });
  });

  describe('getRemainingCapacity', () => {
    it('should return the consultant remaining capacity from the persisted field', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: 'consultant-1',
        capacity: 100,
      });

      const result = await service.getRemainingCapacity(
        'consultant-1',);

      expect(result).toBe(100);
      expect(mockPrismaService.consultant.findUnique).toHaveBeenCalledWith({
        where: { id: 'consultant-1' },
        select: { capacity: true },
      });
    });

    it('should return the remaining persisted capacity value', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: 'consultant-1',
        capacity: 45,
      });

      const result = await service.getRemainingCapacity(
        'consultant-1',);

      expect(result).toBe(45);
    });

    it('should return 0 when the persisted capacity is exhausted', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: 'consultant-1',
        capacity: 0,
      });

      const result = await service.getRemainingCapacity(
        'consultant-1',);

      expect(result).toBe(0);
    });

    it('should throw NotFoundException when getRemainingCapacity cannot find the consultant', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue(null);

      await expect(service.getRemainingCapacity('missing-consultant')).rejects.toThrow(NotFoundException);
    });


    // it('should only consider active placements', async () => {
    //   mockPrismaService.projectPlacement.findMany.mockResolvedValue([]);

    //   await service.getRemainingCapacity(
    //     'consultant-1',
    //     new Date('2026-06-01'),
    //     new Date('2026-12-01'),
    //   );

    //   expect(mockPrismaService.projectPlacement.findMany).toHaveBeenCalledWith({
    //     where: {
    //       consultantId: 'consultant-1',
    //       status: PlacementStatus.ACTIVE,
    //       startDate: {
    //         lte: new Date('2026-12-01'),
    //       },
    //       OR: [
    //         { endDate: null },
    //         { endDate: { gte: new Date('2026-06-01') } },
    //       ],
    //     },
    //     select: {
    //       allocation: true,
    //     },
    //   });
    // });

    // it('should handle an open-ended period', async () => {
    //   mockPrismaService.projectPlacement.findMany.mockResolvedValue([
    //     { allocation: 40 },
    //   ]);

    //   const result = await service.getRemainingCapacity(
    //     'consultant-1',
    //     new Date('2026-06-01'),
    //     null,
    //   );

    //   expect(result).toBe(60);

    //   expect(mockPrismaService.projectPlacement.findMany).toHaveBeenCalledWith({
    //     where: {
    //       consultantId: 'consultant-1',
    //       status: PlacementStatus.ACTIVE,
    //       startDate: undefined,
    //       OR: [
    //         { endDate: null },
    //         { endDate: { gte: new Date('2026-06-01') } },
    //       ],
    //     },
    //     select: {
    //       allocation: true,
    //     },
    //   });
    // });
  });
});