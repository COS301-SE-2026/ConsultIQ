import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectStatus } from '@prisma/client';

const mockTx = {
  project: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  projectManager: {
    create: jest.fn(),
  },
  skill: {
    upsert: jest.fn(),
  },
  projectSkill: {
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

const mockPrismaService = {
  project: {
    findUnique: jest.fn(),
  },
  projectManager: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  $queryRaw: jest.fn(),
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

const mockProjectRows = [
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
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    jest.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation((callback: (tx: typeof mockTx) => unknown) =>
      callback(mockTx),
    );
  });

  //--------- createProject ----------

  describe('createProject - happy path', () => {
    it('should create a project and return projectId', async () => {
      mockTx.project.create.mockResolvedValue({ id: 'uuid-123' });
      mockTx.skill.upsert.mockResolvedValue({ id: 'skill-1' });

      const result = await service.createProject(baseDto, 'user-123', 'PROJECT_MANAGER');

      expect(result).toEqual({
        message: 'Project created successfully',
        projectId: 'uuid-123',
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockTx.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ projectName: 'Test Project' }),
        }),
      );
      expect(mockTx.projectManager.create).toHaveBeenCalledWith({
        data: { userId: 'user-123', projectId: 'uuid-123' },
      });
    });

    it('should create a project without an endDate', async () => {
      const dto = { ...baseDto, endDate: undefined };
      mockTx.project.create.mockResolvedValue({ id: 'uuid-456' });
      mockTx.skill.upsert.mockResolvedValue({ id: 'skill-1' });

      const result = await service.createProject(dto, 'user-123', 'PROJECT_MANAGER');

      expect(result.projectId).toBe('uuid-456');
      expect(mockTx.project.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ endDate: null }) }),
      );
    });

    it('should create a project when endDate is provided and valid', async () => {
      mockTx.project.create.mockResolvedValue({ id: 'uuid-111' });
      mockTx.skill.upsert.mockResolvedValue({ id: 'skill-1' });
      const dto = { ...baseDto, startDate: '2026-06-01', endDate: '2026-12-01' };

      const result = await service.createProject(dto, 'user-123', 'PROJECT_MANAGER');

      expect(result).toEqual({
        message: 'Project created successfully',
        projectId: 'uuid-111',
      });
    });
  });

  describe('createProject - status default', () => {
    it('should force status to OPEN regardless of caller input', async () => {
      mockTx.project.create.mockResolvedValue({ id: 'uuid-789' });
      mockTx.skill.upsert.mockResolvedValue({ id: 'skill-1' });

      await service.createProject(baseDto, 'user-123', 'PROJECT_MANAGER');

      expect(mockTx.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ProjectStatus.OPEN }),
        }),
      );
    });
  });

  describe('createProject - date validation', () => {
    it('should throw BadRequestException if endDate is before startDate', async () => {
      const dto = { ...baseDto, startDate: '2026-12-01', endDate: '2026-06-01' };

      await expect(service.createProject(dto, 'user-123', 'PROJECT_MANAGER')).rejects.toThrow(BadRequestException);
      await expect(service.createProject(dto, 'user-123', 'PROJECT_MANAGER')).rejects.toThrow('End date must be after start date.');
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if endDate equals startDate', async () => {
      const dto = { ...baseDto, startDate: '2026-06-01', endDate: '2026-06-01' };

      await expect(service.createProject(dto, 'user-123', 'PROJECT_MANAGER')).rejects.toThrow(BadRequestException);
    });

    it('should NOT throw if endDate is after startDate', async () => {
      mockTx.project.create.mockResolvedValue({ id: 'uuid-999' });
      mockTx.skill.upsert.mockResolvedValue({ id: 'skill-1' });
      const dto = { ...baseDto, startDate: '2026-06-01', endDate: '2026-06-02' };

      await expect(service.createProject(dto, 'user-123', 'PROJECT_MANAGER')).resolves.not.toThrow();
    });
  });

  describe('createProject - RBAC', () => {
    it('should throw ForbiddenException if role is not PROJECT_MANAGER or ADMIN', async () => {
      await expect(
        service.createProject(baseDto, 'user-123', 'CONSULTANT'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to create a project', async () => {
      mockTx.project.create.mockResolvedValue({ id: 'uuid-123' });
      mockTx.skill.upsert.mockResolvedValue({ id: 'skill-1' });
      const result = await service.createProject(baseDto, 'user-123', 'ADMIN');
      expect(result.projectId).toBe('uuid-123');
    });
  });

  //----------- getAllProjects ----------
  describe('getAllProjects - ADMIN', () => {
    it('should return all projects for ADMIN', async () => {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce(mockProjectRows)
        .mockResolvedValueOnce([{ count: 2 }]);

      const result = await service.getAllProjects(1, 10, 'ADMIN', null);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(2);
      expect(result.projects).toHaveLength(2);
    });
  });

  describe('getAllProjects - PROJECT_MANAGER', () => {
    it('should return only managed projects for PROJECT_MANAGER', async () => {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockProjectRows[0]])
        .mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.getAllProjects(1, 10, 'PROJECT_MANAGER', 'user-123');

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(1);
    });
  });

  describe('getAllProjects - CONSULTANT_MANAGER', () => {
    it('should return projects of managed consultants for CONSULTANT_MANAGER', async () => {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockProjectRows[0]])
        .mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.getAllProjects(1, 10, 'CONSULTANT_MANAGER', 'user-456');

      expect(result.total).toBe(1);
    });
  });

  describe('getAllProjects - CONSULTANT', () => {
    it('should return only assigned projects for CONSULTANT', async () => {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockProjectRows[1]])
        .mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.getAllProjects(1, 10, 'CONSULTANT', 'user-789');

      expect(result.total).toBe(1);
    });
  });

  describe('getAllProjects - RBAC enforcement', () => {
    it('should throw ForbiddenException for unknown role', async () => {
      await expect(
        service.getAllProjects(1, 10, 'UNKNOWN_ROLE', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not call $queryRaw for unknown role', async () => {
      await expect(
        service.getAllProjects(1, 10, 'UNKNOWN_ROLE', 'user-123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrismaService.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('getAllProjects - mapping', () => {
    it('should correctly map all project fields', async () => {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce(mockProjectRows)
        .mockResolvedValueOnce([{ count: 2 }]);

      const result = await service.getAllProjects(1, 10, 'ADMIN', null);
      const first = result.projects[0];

      expect(first.id).toBe('uuid-1');
      expect(first.projectName).toBe('Project Alpha');
      expect(first.skillCount).toBe(3);
      expect(first.clientBillingBudget).toBe(500000);
    });

    it('should handle project with null endDate', async () => {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce(mockProjectRows)
        .mockResolvedValueOnce([{ count: 2 }]);

      const result = await service.getAllProjects(1, 10, 'ADMIN', null);

      expect(result.projects[1].endDate).toBeNull();
    });

    it('should return empty projects array when no results', async () => {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }]);

      const result = await service.getAllProjects(1, 10, 'ADMIN', null);

      expect(result.projects).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // -----------updateProject ---------

  describe('ProjectService - updateProject', () => {
    const existingProject = {
      id: 'project-123',
      projectName: 'Old Name',
      startDate: new Date('2026-06-25'),
      endDate: new Date('2026-12-25'),
    };

    it('throws NotFoundException when project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProject('missing-id', {}, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not project manager', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaService.projectManager.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProject('project-123', {}, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when endDate is before startDate', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaService.projectManager.findUnique.mockResolvedValue({ id: 'pm-1' });

      await expect(
        service.updateProject(
          'project-123',
          { endDate: '2026-01-01' } as any,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates successfully when user is project manager and dates are valid', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaService.projectManager.findUnique.mockResolvedValue({ id: 'pm-1' });
      mockTx.project.update.mockResolvedValue({});
      mockTx.project.findUnique.mockResolvedValue({
        ...existingProject,
        budget: 1000000,
      });

      const result = await service.updateProject(
        'project-123',
        { budget: 1000000 } as any,
        'user-1',
      );

      expect(result).toEqual({
        ...existingProject,
        budget: 1000000,
      });
      expect(mockTx.project.update).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        data: expect.objectContaining({ budget: 1000000 }),
      });
    });

    it('allows any status transition with no restrictions', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...existingProject,
        status: ProjectStatus.OPEN,
      });
      mockPrismaService.projectManager.findUnique.mockResolvedValue({ id: 'pm-1' });
      mockTx.project.update.mockResolvedValue({});
      mockTx.project.findUnique.mockResolvedValue({
        ...existingProject,
        status: ProjectStatus.COMPLETED,
      });

      const result = await service.updateProject(
        'project-123',
        { status: ProjectStatus.COMPLETED } as any,
        'user-1',
      );

      expect(result).toEqual({
        ...existingProject,
        status: ProjectStatus.COMPLETED,
      });
      expect(mockTx.project.update).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        data: expect.objectContaining({ status: ProjectStatus.COMPLETED }),
      });
    });
  });

  describe('ProjectService - updateProject field coverage', () => {
    const existingProject = {
      id: 'project-123',
      projectName: 'Old Name',
      startDate: new Date('2026-06-25'),
      endDate: new Date('2026-12-25'),
    };

    beforeEach(() => {
      mockPrismaService.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaService.projectManager.findUnique.mockResolvedValue({ id: 'pm-1' });
      mockTx.project.update.mockResolvedValue({});
      mockTx.project.findUnique.mockResolvedValue({ ...existingProject });
    });

    it('builds update data for every core field when provided', async () => {
      const dto: any = {
        projectName: 'New Name',
        clientName: 'New Client',
        description: 'New description',
        addressLine1: '1 New St',
        addressLine2: 'Unit 2',
        suburb: 'New Suburb',
        city: 'New City',
        province: 'New Province',
        postalCode: '9999',
        startDate: '2027-01-01',
        endDate: '2027-06-01',
        teamSize: 10,
        allocation: 90,
      };

      await service.updateProject('project-123', dto, 'user-1');

      expect(mockTx.project.update).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        data: expect.objectContaining({
          projectName: 'New Name',
          clientName: 'New Client',
          description: 'New description',
          addressLine1: '1 New St',
          addressLine2: 'Unit 2',
          suburb: 'New Suburb',
          city: 'New City',
          province: 'New Province',
          postalCode: '9999',
          teamSize: 10,
          allocation: 90,
        }),
      });
    });

    it('does not call project.update when no core fields are provided', async () => {
      await service.updateProject('project-123', { skills: [] } as any, 'user-1');
      expect(mockTx.project.update).not.toHaveBeenCalled();
    });

    it('removes project skills when removeSkillIds is provided', async () => {
      await service.updateProject(
        'project-123',
        { removeSkillIds: ['skill-a', 'skill-b'] } as any,
        'user-1',
      );

      expect(mockTx.projectSkill.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['skill-a', 'skill-b'] }, projectId: 'project-123' },
      });
    });

    it('does not call deleteMany when removeSkillIds is empty or omitted', async () => {
      await service.updateProject('project-123', {} as any, 'user-1');
      expect(mockTx.projectSkill.deleteMany).not.toHaveBeenCalled();
    });

    it('creates a new project skill when no id is given', async () => {
      mockTx.skill.upsert.mockResolvedValue({ id: 'skill-new' });
      mockTx.projectSkill.findFirst.mockResolvedValue(null);
      await service.updateProject(
        'project-123',
        {
          skills: [
            { name: 'Docker', competency: 'INTERMEDIATE', years: 2, mandatory: true },
          ],
        } as any,
        'user-1',
      );

      expect(mockTx.projectSkill.findFirst).toHaveBeenCalledWith({
        where: { projectId: 'project-123', skillId: 'skill-new' }
      });

      expect(mockTx.skill.upsert).toHaveBeenCalledWith({
        where: { name: 'docker' },
        update: {},
        create: { name: 'docker', category: 'General' },
      });
      expect(mockTx.projectSkill.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-123',
          skillId: 'skill-new',
          competency: 'INTERMEDIATE',
          years: 2,
          mandatory: true,
        },
      });
    });

    it('updates an existing project skill when an id is given', async () => {
      mockTx.skill.upsert.mockResolvedValue({ id: 'skill-existing' });
      mockTx.projectSkill.findFirst.mockResolvedValue({ id: 'project-skill-1' });
      await service.updateProject(
        'project-123',
        {
          skills: [
            {
              id: 'project-skill-1',
              name: 'Kubernetes',
              competency: 'EXPERT',
              years: 4,
              mandatory: false,
            },
          ],
        } as any,
        'user-1',
      );
      expect(mockTx.projectSkill.findFirst).toHaveBeenCalledWith({
        where: { projectId: 'project-123', skillId: 'skill-existing' }
      });
      expect(mockTx.projectSkill.update).toHaveBeenCalledWith({
        where: { id: 'project-skill-1' },
        data: {
          //skillId: 'skill-existing',
          competency: 'EXPERT',
          years: 4,
          mandatory: false,
        },
      });
    });

    it('does not call skill upsert/create/update when skills array is empty', async () => {
      await service.updateProject('project-123', { skills: [] } as any, 'user-1');
      expect(mockTx.skill.upsert).not.toHaveBeenCalled();
      expect(mockTx.projectSkill.create).not.toHaveBeenCalled();
      expect(mockTx.projectSkill.update).not.toHaveBeenCalled();
    });
  });

  describe('getAllProjects - total fallback', () => {
    it('defaults total to 0 when the count query returns no rows', async () => {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const result = await service.getAllProjects(1, 10, 'ADMIN', null);
      expect(result.total).toBe(0);
    });
  });

  //--------- validateProjectIsComplete --------

  describe('ProjectService - validateProjectIsComplete', () => {
    it('resolves without throwing when project status is OPEN', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({ status: ProjectStatus.OPEN });
      await expect(service.validateProjectIsComplete('project-1')).resolves.toBeUndefined();
    });

    it('throws BadRequestException when project status is CLOSED', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({ status: ProjectStatus.CLOSED });
      await expect(service.validateProjectIsComplete('project-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateProjectIsComplete('project-1')).rejects.toThrow(
        /CLOSED/,
      );
    });

    it('throws BadRequestException when project status is COMPLETED', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({ status: ProjectStatus.COMPLETED });
      await expect(service.validateProjectIsComplete('project-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateProjectIsComplete('project-1')).rejects.toThrow(
        /COMPLETED/,
      );
    });

    it('resolves without throwing when project status is IN_PROGRESS', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({ status: ProjectStatus.IN_PROGRESS });
      await expect(service.validateProjectIsComplete('project-1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);
      await expect(service.validateProjectIsComplete('project-1')).rejects.toThrow(
        /Project with ID project-1 not found/,
      );
    });
  });
});