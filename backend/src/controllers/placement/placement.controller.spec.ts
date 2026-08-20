import { Test, TestingModule } from '@nestjs/testing';
import { PlacementController } from './placement.controller';
import { PlacementService } from '../../placement/services/placement.service';
import { ForbiddenException } from '@nestjs/common';

const mockPlacementService = {
  createPlacement: jest.fn(),
};

describe('PlacementController', () => {
  let controller: PlacementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacementController],
      providers: [
        { provide: PlacementService, useValue: mockPlacementService },
      ],
    }).compile();

    controller = module.get<PlacementController>(PlacementController);
    jest.clearAllMocks();
  });

  describe('createPlacement', () => {
    const dto = {
      consultantId: 'consultant-1',
      startDate: '2026-06-01',
      endDate: '2026-12-01',
      allocation: 50,
    };

    it('should throw ForbiddenException if req.user has no userId', async () => {
      const req = { user: {} };

      await expect(
        controller.createPlacement('project-1', dto, req),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPlacementService.createPlacement).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if req.user is missing entirely', async () => {
      const req = {};

      await expect(
        controller.createPlacement('project-1', dto, req),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should call service with projectId, dto, and userId, and return its result', async () => {
      mockPlacementService.createPlacement.mockResolvedValue({
        message: 'Placement created successfully.',
        placementId: 'placement-1',
      });

      const req = { user: { userId: 'user-123' } };
      const result = await controller.createPlacement('project-1', dto, req);

      expect(mockPlacementService.createPlacement).toHaveBeenCalledWith(
        'project-1',
        dto,
        'user-123',
      );
      expect(result).toEqual({
        message: 'Placement created successfully.',
        placementId: 'placement-1',
      });
    });

    it('should propagate errors thrown by the service', async () => {
      mockPlacementService.createPlacement.mockRejectedValue(
        new Error('This consultant is already placed on this project.'),
      );

      const req = { user: { userId: 'user-123' } };
      await expect(
        controller.createPlacement('project-1', dto, req),
      ).rejects.toThrow('This consultant is already placed on this project.');
    });
  });
});