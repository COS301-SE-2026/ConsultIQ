import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from './project.controller';
import { ProjectService } from '../../projects/services/project.service';

const mockProjectService = {
  createProject: jest.fn(),
  getAllProjects: jest.fn(),
};

describe('ProjectController', () => {
  let controller: ProjectController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
      ],
    }).compile();

    controller = module.get<ProjectController>(ProjectController);
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project and return the result', async () => {
      const dto = {
        projectName: 'Test Project',
        clientName: 'Test Client',
        addressLine1: '123 Test Street',
        city: 'Pretoria',
        province: 'Gauteng',
        startDate: '2026-06-01',
        endDate: '2026-12-01',
        teamSize: 5,
        allocation: 80,
        budget: 500000,
        skills: [
          { name: 'TypeScript', competency: 'INTERMEDIATE', mandatory: true, years: 2 },
        ],
      };

      const req = { user: { sub: 'user-123', role: 'PROJECT_MANAGER' } };

      mockProjectService.createProject.mockResolvedValue({
        message: 'Project created successfully',
        projectId: 'uuid-123',
      });

      const result = await controller.createProject(dto as any, req);

      expect(result).toEqual({
        message: 'Project created successfully',
        projectId: 'uuid-123',
      });
      expect(mockProjectService.createProject).toHaveBeenCalledWith(dto, 'user-123', 'PROJECT_MANAGER');
    });

    it('should propagate errors from service', async () => {
      const req = { user: { sub: 'user-123', role: 'PROJECT_MANAGER' } };
      mockProjectService.createProject.mockRejectedValue(new Error('Service error'));

      await expect(controller.createProject({} as any, req)).rejects.toThrow('Service error');
    });
  });

  describe('getAllProjects', () => {
    it('should return paginated projects with default page and limit', async () => {
      mockProjectService.getAllProjects.mockResolvedValue({
        page: 1,
        limit: 10,
        total: 0,
        projects: [],
      });

      const result = await controller.getAllProjects('1', '10', { user: { role: 'ADMIN', sub: 'user-123' } } as any);

      expect(result).toEqual({ page: 1, limit: 10, total: 0, projects: [] });
      expect(mockProjectService.getAllProjects).toHaveBeenCalledWith(1, 10, 'ADMIN', 'user-123');
    });

    it('should parse page and limit as integers', async () => {
      mockProjectService.getAllProjects.mockResolvedValue({
        page: 2,
        limit: 5,
        total: 10,
        projects: [],
      });

      await controller.getAllProjects('2', '5', { user: { role: 'ADMIN', sub: 'user-123' } } as any);

      expect(mockProjectService.getAllProjects).toHaveBeenCalledWith(2, 5, 'ADMIN', 'user-123');
    });

    it('should return projects list', async () => {
      const mockResponse = {
        page: 1,
        limit: 10,
        total: 1,
        projects: [
          {
            id: 'uuid-1',
            projectName: 'Project Alpha',
            clientName: 'Client A',
            city: 'Pretoria',
            province: 'Gauteng',
            startDate: new Date('2026-06-01'),
            endDate: null,
            teamSize: 5,
            requiredAllocationPercentage: 80,
            clientBillingBudget: 500000,
            status: 'OPEN',
            skillCount: 2,
          },
        ],
      };

      mockProjectService.getAllProjects.mockResolvedValue(mockResponse);

      await controller.getAllProjects('1', '10', { user: { role: 'ADMIN', sub: 'user-123' } } as any);

      expect(mockProjectService.getAllProjects).toHaveBeenCalledWith(1, 10, 'ADMIN', 'user-123');
    });
  });
});