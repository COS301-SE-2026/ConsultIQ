import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PlacementService } from './placement.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlacementStatus } from '@prisma/client';
import { mock } from 'node:test';

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
  },
  $transaction: jest.fn(async (callback) => callback(mockPrismaService)),
};

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
      ],
    }).compile();

    service = module.get<PlacementService>(PlacementService);

    jest.clearAllMocks();
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
      });

      mockPrismaService.consultant.findUnique.mockResolvedValue(null);

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.projectPlacement.findFirst).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if the consultant is already placed on the project', async () => {
      mockPrismaService.projectManager.findUnique.mockResolvedValue({
        userId: 'user-123',
        projectId: 'project-1',
      });

      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-1',
      });

      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: 'consultant-1',
      });

      mockPrismaService.projectPlacement.findFirst.mockResolvedValue({
        id: 'placement-1',
        projectId: 'project-1',
        consultantId: 'consultant-1',
      });

      await expect(
        service.createPlacement('project-1', dto, 'user-123'),
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.projectPlacement.create).not.toHaveBeenCalled();
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
      mockPrismaService.projectManager.findUnique.mockResolvedValue({
        userId: 'user-123',
        projectId: 'project-1',
      });

      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-1',
      });

      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: 'consultant-1',
        capacity: 100,
      });

      mockPrismaService.projectPlacement.findFirst.mockResolvedValue(null);
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
        where: {id: 'consultant-1'},
        data: {
          capacity: {decrement: 50},
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
    });

    it('should allow a placement when the requested allocation exactly matches remaining capacity', async () => {
      mockPrismaService.projectManager.findUnique.mockResolvedValue({
        userId: 'user-123',
        projectId: 'project-1',
      });

      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-1',
      });

      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: 'consultant-1',
        capacity: 50,
      });

      mockPrismaService.projectPlacement.findFirst.mockResolvedValue(null);
      mockPrismaService.consultant.update.mockResolvedValue({
        id: 'consultant-1',
        capacity: 0,
        availability: 'UNAVAILABLE'
      })
      mockPrismaService.projectPlacement.create.mockResolvedValue({
        id: 'placement-2',
      });

      const result = await service.createPlacement(
        'project-1',
        dto,
        'user-123',
      );

      expect(result).toEqual({
        message: 'Placement created successfully.',
        placementId: 'placement-2',
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