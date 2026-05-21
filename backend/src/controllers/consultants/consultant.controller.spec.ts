import { Test, TestingModule } from '@nestjs/testing';
import { ConsultantController } from './consultant.controller';
import { ConsultantService } from '../../consultants/services/consultant.service';

const mockConsultantService = {
  createConsultant: jest.fn(),
  getAllConsultants: jest.fn(),
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

  describe('createConsultant', () => {
    it('should create a consultant and return the result', async () => {
      const dto = {
        fullName: 'John Doe',
        email: 'john@example.com',
        location: 'Pretoria',
        costToCompanyRate: 50000,
        availabilityStatus: 'AVAILABLE',
        skills: [
          { skillName: 'TypeScript', yearsExperience: 3, confidenceLevel: 8 },
        ],
        certifications: [],
      };

      mockConsultantService.createConsultant.mockResolvedValue({
        message: 'Consultant created successfully',
        consultantId: 'uuid-123',
      });

      const result = await controller.createConsultant(dto as any);

      expect(result).toEqual({
        message: 'Consultant created successfully',
        consultantId: 'uuid-123',
      });
      expect(mockConsultantService.createConsultant).toHaveBeenCalledWith(dto);
    });

    it('should propagate errors from service', async () => {
      mockConsultantService.createConsultant.mockRejectedValue(
        new Error('Service error'),
      );

      await expect(controller.createConsultant({} as any)).rejects.toThrow(
        'Service error',
      );
    });
  });

  describe('getAllConsultants', () => {
    it('should return paginated consultants', async () => {
      const mockResponse = {
        page: 1,
        total: 0,
        consultants: [],
      };

      mockConsultantService.getAllConsultants.mockResolvedValue(mockResponse);

      const req = { user: { role: 'ADMIN' } };
      const result = await controller.getAllConsultants('1', '10', req);

      expect(result).toEqual(mockResponse);
      expect(mockConsultantService.getAllConsultants).toHaveBeenCalledWith(
        1,
        10,
        'ADMIN',
      );
    });

    it('should default to PROJECT_MANAGER role when no user on request', async () => {
      mockConsultantService.getAllConsultants.mockResolvedValue({
        page: 1,
        total: 0,
        consultants: [],
      });

      const req = {};
      await controller.getAllConsultants('1', '10', req);

      expect(mockConsultantService.getAllConsultants).toHaveBeenCalledWith(
        1,
        10,
        'PROJECT_MANAGER',
      );
    });

    it('should parse page and limit as integers', async () => {
      mockConsultantService.getAllConsultants.mockResolvedValue({
        page: 3,
        total: 30,
        consultants: [],
      });

      const req = { user: { role: 'ADMIN' } };
      await controller.getAllConsultants('3', '5', req);

      expect(mockConsultantService.getAllConsultants).toHaveBeenCalledWith(
        3,
        5,
        'ADMIN',
      );
    });

    it('should return consultants list', async () => {
      const mockResponse = {
        page: 1,
        total: 1,
        consultants: [
          {
            id: 'uuid-1',
            fullName: 'Jane Doe',
            location: 'Cape Town',
            availabilityStatus: 'AVAILABLE',
            primarySkills: ['TypeScript'],
            costToCompanyRate: 50000,
          },
        ],
      };

      mockConsultantService.getAllConsultants.mockResolvedValue(mockResponse);

      const req = { user: { role: 'ADMIN', sub: 'user-123' } };
      const result = await controller.getAllConsultants('1', '10', req);

      expect(result.consultants).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});