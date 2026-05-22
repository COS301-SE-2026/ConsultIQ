import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { ProjectRepository } from '../repositories/project.repository';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateProjectDto } from '../dto/create-project.dto';

const mockProjectRepository = {
  createProject: jest.fn(),
  getAllProjects: jest.fn(),
  getProjectsByProjectManager: jest.fn(),
  getProjectsByConsultantManager: jest.fn(),
  getProjectsByConsultant: jest.fn(),
};

const baseDto: CreateProjectDto = {
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

  //Create Project 

  describe('createProject - happy path', () => {
    it('should create a project and return projectId', async () => {
      mockProjectRepository.createProject.mockResolvedValue({ projectId: 'uuid-123' });

      const result = await service.createProject(baseDto, 'user-123', 'PROJECT_MANAGER');

      expect(result).toEqual({
        message: 'Project created successfully',
        projectId: 'uuid-123',
      });
      expect(mockProjectRepository.createProject).toHaveBeenCalledWith(baseDto, 'user-123');
    });

    it('should create a project without an endDate', async () => {
      const dto = { ...baseDto, endDate: undefined };
      mockProjectRepository.createProject.mockResolvedValue({ projectId: 'uuid-456' });

      const result = await service.createProject(dto, 'user-123', 'PROJECT_MANAGER');

      expect(result.projectId).toBe('uuid-456');
    });

    it('should create a project when endDate is provided and valid', async () => {
      mockProjectRepository.createProject.mockResolvedValue({ projectId: 'uuid-111' });
      const dto = { ...baseDto, startDate: '2026-06-01', endDate: '2026-12-01' };

      const result = await service.createProject(dto, 'user-123', 'PROJECT_MANAGER');

      expect(result).toEqual({
        message: 'Project created successfully',
        projectId: 'uuid-111',
      });
    });
  });

  describe('createProject - status default', () => {
    it('should always pass dto as-is and let repository force status to OPEN', async () => {
      mockProjectRepository.createProject.mockResolvedValue({ projectId: 'uuid-789' });

      await service.createProject(baseDto, 'user-123', 'PROJECT_MANAGER');

      expect(mockProjectRepository.createProject).toHaveBeenCalledWith(
        expect.not.objectContaining({ status: expect.anything() }),
        'user-123',  // <-- add this second argument
      );
    });
  });

  describe('createProject - date validation', () => {
    it('should throw BadRequestException if endDate is before startDate', async () => {
      const dto = { ...baseDto, startDate: '2026-12-01', endDate: '2026-06-01' };

      await expect(service.createProject(dto, 'user-123', 'PROJECT_MANAGER')).rejects.toThrow(BadRequestException);
      await expect(service.createProject(dto, 'user-123', 'PROJECT_MANAGER')).rejects.toThrow('End date must be after start date.');
      expect(mockProjectRepository.createProject).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if endDate equals startDate', async () => {
      const dto = { ...baseDto, startDate: '2026-06-01', endDate: '2026-06-01' };

      await expect(service.createProject(dto, 'user-123', 'PROJECT_MANAGER')).rejects.toThrow(BadRequestException);
    });

    it('should NOT throw if endDate is after startDate', async () => {
      mockProjectRepository.createProject.mockResolvedValue({ projectId: 'uuid-999' });
      const dto = { ...baseDto, startDate: '2026-06-01', endDate: '2026-06-02' };

      await expect(service.createProject(dto, 'user-123', 'PROJECT_MANAGER')).resolves.not.toThrow();
    });
  });

  //Get All Projects - RBAC

  describe('getAllProjects - ADMIN', () => {
    it('should return all projects for ADMIN', async () => {
      mockProjectRepository.getAllProjects.mockResolvedValue({
        projects: mockProjects,
        total: 2,
      });

      const result = await service.getAllProjects(1, 10, 'ADMIN', null);

      expect(mockProjectRepository.getAllProjects).toHaveBeenCalledWith(1, 10);
      expect(result.total).toBe(2);
      expect(result.projects).toHaveLength(2);
    });
  });

  describe('getAllProjects - PROJECT_MANAGER', () => {
    it('should return only managed projects for PROJECT_MANAGER', async () => {
      mockProjectRepository.getProjectsByProjectManager.mockResolvedValue({
        projects: [mockProjects[0]],
        total: 1,
      });

      const result = await service.getAllProjects(1, 10, 'PROJECT_MANAGER', 'user-123');

      expect(mockProjectRepository.getProjectsByProjectManager).toHaveBeenCalledWith('user-123', 1, 10);
      expect(result.total).toBe(1);
    });
  });

  describe('getAllProjects - CONSULTANT_MANAGER', () => {
    it('should return projects of managed consultants for CONSULTANT_MANAGER', async () => {
      mockProjectRepository.getProjectsByConsultantManager.mockResolvedValue({
        projects: [mockProjects[0]],
        total: 1,
      });

      const result = await service.getAllProjects(1, 10, 'CONSULTANT_MANAGER', 'user-456');

      expect(mockProjectRepository.getProjectsByConsultantManager).toHaveBeenCalledWith('user-456', 1, 10);
      expect(result.total).toBe(1);
    });
  });

  describe('getAllProjects - CONSULTANT', () => {
    it('should return only assigned projects for CONSULTANT', async () => {
      mockProjectRepository.getProjectsByConsultant.mockResolvedValue({
        projects: [mockProjects[1]],
        total: 1,
      });

      const result = await service.getAllProjects(1, 10, 'CONSULTANT', 'user-789');

      expect(mockProjectRepository.getProjectsByConsultant).toHaveBeenCalledWith('user-789', 1, 10);
      expect(result.total).toBe(1);
    });
  });

  describe('getAllProjects - RBAC enforcement', () => {
    it('should throw ForbiddenException for unknown role', async () => {
      await expect(
        service.getAllProjects(1, 10, 'UNKNOWN_ROLE', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not call any repository method for unknown role', async () => {
      await expect(
        service.getAllProjects(1, 10, 'UNKNOWN_ROLE', 'user-123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockProjectRepository.getAllProjects).not.toHaveBeenCalled();
      expect(mockProjectRepository.getProjectsByProjectManager).not.toHaveBeenCalled();
      expect(mockProjectRepository.getProjectsByConsultantManager).not.toHaveBeenCalled();
      expect(mockProjectRepository.getProjectsByConsultant).not.toHaveBeenCalled();
    });
  });

  describe('getAllProjects - mapping', () => {
    it('should correctly map all project fields', async () => {
      mockProjectRepository.getAllProjects.mockResolvedValue({
        projects: mockProjects,
        total: 2,
      });

      const result = await service.getAllProjects(1, 10, 'ADMIN', null);
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

      const result = await service.getAllProjects(1, 10, 'ADMIN', null);

      expect(result.projects[1].endDate).toBeNull();
    });

    it('should return empty projects array when no results', async () => {
      mockProjectRepository.getAllProjects.mockResolvedValue({
        projects: [],
        total: 0,
      });

      const result = await service.getAllProjects(1, 10, 'ADMIN', null);

      expect(result.projects).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
  describe('createProject - RBAC', () => {
    it('should throw ForbiddenException if role is not PROJECT_MANAGER or ADMIN', async () => {
      await expect(
        service.createProject(baseDto, 'user-123', 'CONSULTANT'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to create a project', async () => {
      mockProjectRepository.createProject.mockResolvedValue({ projectId: 'uuid-123' });
      const result = await service.createProject(baseDto, 'user-123', 'ADMIN');
      expect(result.projectId).toBe('uuid-123');
    });
  });
});