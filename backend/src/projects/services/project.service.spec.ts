import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { ProjectRepository } from '../repositories/project.repository';
import { BadRequestException } from '@nestjs/common';
import { CreateProjectDto } from '../dto/create-project.dto';

const mockProjectRepository = {
  createProject: jest.fn(),
  getAllProjects: jest.fn(),
};

const baseDto: CreateProjectDto = {
  projectName: 'Test Project',
  clientName: 'Test Client',
  city: 'Pretoria',
  province: 'Gauteng',
  startDate: '2026-06-01',
  endDate: '2026-12-01',
  teamSize: 5,
  requiredAllocationPercentage: 80,
  clientBillingBudget: 500000,
  skills: [
    { skillName: 'TypeScript', minimumCompetency: 'INTERMEDIATE', isMandatory: true },
  ],
};

const mockProjects = [
  {
    id: 'uuid-1',
    projectName: 'Project Alpha',
    clientName: 'Client A',
    city: 'Pretoria',
    province: 'Gauteng',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-12-01'),
    teamSize: 5,
    requiredAllocationPercentage: 80,
    clientBillingBudget: 500000,
    status: 'OPEN',
    skillCount: 3,
  },
  {
    id: 'uuid-2',
    projectName: 'Project Beta',
    clientName: 'Client B',
    city: 'Cape Town',
    province: 'Western Cape',
    startDate: new Date('2026-07-01'),
    endDate: null,
    teamSize: 3,
    requiredAllocationPercentage: 50,
    clientBillingBudget: 200000,
    status: 'OPEN',
    skillCount: 0,
  },
];

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: ProjectRepository, useValue: mockProjectRepository },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    jest.clearAllMocks();
  });

  //Create Project Endpoint
  describe('createProject - happy path', () => {
    it('should create a project and return projectId', async () => {
      mockProjectRepository.createProject.mockResolvedValue({ projectId: 'uuid-123' });

      const result = await service.createProject(baseDto);

      expect(result).toEqual({
        message: 'Project created successfully',
        projectId: 'uuid-123',
      });
      expect(mockProjectRepository.createProject).toHaveBeenCalledWith(baseDto);
    });

    it('should create a project without an endDate', async () => {
      const dto = { ...baseDto, endDate: undefined };
      mockProjectRepository.createProject.mockResolvedValue({ projectId: 'uuid-456' });

      const result = await service.createProject(dto);

      expect(result.projectId).toBe('uuid-456');
    });
  });

  describe('createProject - status default', () => {
    it('should always pass dto as-is and let repository force status to OPEN', async () => {
      mockProjectRepository.createProject.mockResolvedValue({ projectId: 'uuid-789' });

      await service.createProject(baseDto);

      expect(mockProjectRepository.createProject).toHaveBeenCalledWith(
        expect.not.objectContaining({ status: expect.anything() }),
      );
    });
  });

  describe('createProject - date validation', () => {
    it('should throw BadRequestException if endDate is before startDate', async () => {
      const dto = { ...baseDto, startDate: '2026-12-01', endDate: '2026-06-01' };

      await expect(service.createProject(dto)).rejects.toThrow(BadRequestException);
      await expect(service.createProject(dto)).rejects.toThrow('End date must be after start date.');
      expect(mockProjectRepository.createProject).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if endDate equals startDate', async () => {
      const dto = { ...baseDto, startDate: '2026-06-01', endDate: '2026-06-01' };

      await expect(service.createProject(dto)).rejects.toThrow(BadRequestException);
    });

    it('should NOT throw if endDate is after startDate', async () => {
      mockProjectRepository.createProject.mockResolvedValue({ projectId: 'uuid-999' });
      const dto = { ...baseDto, startDate: '2026-06-01', endDate: '2026-06-02' };

      await expect(service.createProject(dto)).resolves.not.toThrow();
    });
  });

  // Project Management View Paginated Projects

  describe('getAllProjects - happy path', () => {
    it('should return paginated projects with correct structure', async () => {
      mockProjectRepository.getAllProjects.mockResolvedValue({
        projects: mockProjects,
        total: 2,
      });

      const result = await service.getAllProjects(1, 10);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(2);
      expect(result.projects).toHaveLength(2);
    });

    it('should correctly map all project fields', async () => {
      mockProjectRepository.getAllProjects.mockResolvedValue({
        projects: mockProjects,
        total: 2,
      });

      const result = await service.getAllProjects(1, 10);
      const first = result.projects[0];

      expect(first.id).toBe('uuid-1');
      expect(first.projectName).toBe('Project Alpha');
      expect(first.skillCount).toBe(3);
      expect(first.clientBillingBudget).toBe(500000);
    });

    it('should handle project with null endDate', async () => {
      mockProjectRepository.getAllProjects.mockResolvedValue({
        projects: mockProjects,
        total: 2,
      });

      const result = await service.getAllProjects(1, 10);
      const second = result.projects[1];

      expect(second.endDate).toBeNull();
    });

    it('should handle project with zero skills', async () => {
      mockProjectRepository.getAllProjects.mockResolvedValue({
        projects: mockProjects,
        total: 2,
      });

      const result = await service.getAllProjects(1, 10);

      expect(result.projects[1].skillCount).toBe(0);
    });
  });

  describe('getAllProjects - pagination', () => {
    it('should pass page and limit to repository', async () => {
      mockProjectRepository.getAllProjects.mockResolvedValue({
        projects: [],
        total: 0,
      });

      await service.getAllProjects(3, 5);

      expect(mockProjectRepository.getAllProjects).toHaveBeenCalledWith(3, 5);
    });

    it('should return empty projects array when no results', async () => {
      mockProjectRepository.getAllProjects.mockResolvedValue({
        projects: [],
        total: 0,
      });

      const result = await service.getAllProjects(1, 10);

      expect(result.projects).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});