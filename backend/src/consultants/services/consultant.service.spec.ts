import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConsultantService } from './consultant.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/service/notification.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  consultant: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};


const mockNotificationService = {
  createAndSendNotification: jest.fn(),
};


describe('ConsultantService', () => {
  let service: ConsultantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultantService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ConsultantService>(ConsultantService);
    jest.clearAllMocks();
  });

  // ─── createConsultantProfile ────────────────────────────────────────────────

  describe('createConsultantProfile', () => {
    const cmUserId = 'cm-uuid-123';
    const dto = {
      consultantUserId: 'consultant-uuid-123',
      idNumber: '9901015555081',
      phone: '0123456789',
      nationality: 'South African',
      addressLine1: '123 South road',
      addressLine2: null,
      suburb: 'Hillbrow',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2001',
      costToCompany: 50000,
      availability: 'AVAILABLE',
      skills: [
        { skillName: 'TypeScript', competencyLevel: 'EXPERT', yearsExperience: 4, confidenceLevel: 4 },
      ],
      experiences: [
        {
          jobTitle: 'Developer',
          companyName: 'ConsultIQ',
          jobType: 'FULL_TIME',
          workModel: 'REMOTE',
          startDate: '2022-01-01T00:00:00.000Z',
          description: 'Developed things',
        },
      ],
    };

    it('should throw NotFoundException if consultant user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.createConsultantProfile(cmUserId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user role is not CONSULTANT', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'consultant-uuid-123', role: 'ADMIN', status: 'ACTIVE',
      });
      await expect(service.createConsultantProfile(cmUserId, dto as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if user account is not ACTIVE', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'consultant-uuid-123', role: 'CONSULTANT', status: 'PENDING',
      });
      await expect(service.createConsultantProfile(cmUserId, dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if consultant profile already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'consultant-uuid-123', role: 'CONSULTANT', status: 'ACTIVE',
      });
      mockPrismaService.consultant.findUnique.mockResolvedValue({ id: 'existing-consultant' });
      await expect(service.createConsultantProfile(cmUserId, dto as any)).rejects.toThrow(ConflictException);
    });

    it('should create consultant profile successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'consultant-uuid-123', role: 'CONSULTANT', status: 'ACTIVE',
      });
      mockPrismaService.consultant.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockResolvedValue({ consultantId: 'new-consultant-uuid' });

      const result = await service.createConsultantProfile(cmUserId, dto as any);
      expect(result.message).toBe('Consultant profile created successfully.');
      expect(result.consultantId).toBe('new-consultant-uuid');
    });
  });

  // ─── getPendingProfiles ─────────────────────────────────────────────────────

  describe('getPendingProfiles', () => {
    it('should return mapped pending profile users', async () => {
      const mockUsers = [
        { id: 'user-1', fullName: 'Jane Doe', email: 'jane@consultiq.com', createdAt: new Date() },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getPendingProfiles();
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].fullName).toBe('Jane Doe');
    });

    it('should return empty array when no pending profiles exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      const result = await service.getPendingProfiles();
      expect(result).toHaveLength(0);
    });
  });

  // ─── getAllConsultants ──────────────────────────────────────────────────────

  describe('getAllConsultants', () => {
    const mockConsultants = [
      {
        id: 'uuid-1',
        addressLine1: '123 South road',
        addressLine2: null,
        suburb: 'Hillbrow',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2001',
        availability: 'AVAILABLE',
        costToCompany: 650,
        phone: '0123456789',
        idNumber: '9901015555081',
        user: { fullName: 'Jane Smith', email: 'jane@consultiq.com' },
        skills: [{ skill: { name: 'TypeScript' } }],
        certificates: [{ title: 'AWS Certified' }],
        consultantExperiences: [],
      },
    ];

    it('should include costToCompanyRate for CONSULTANT_MANAGER', async () => {
      mockPrismaService.consultant.findMany.mockResolvedValue(mockConsultants);
      mockPrismaService.consultant.count.mockResolvedValue(1);

      const result = await service.getAllConsultants(1, 10, 'CONSULTANT_MANAGER');
      expect(result.consultants[0].costToCompanyRate).toBe(650);
    });

    it('should exclude costToCompanyRate for PROJECT_MANAGER', async () => {
      mockPrismaService.consultant.findMany.mockResolvedValue(mockConsultants);
      mockPrismaService.consultant.count.mockResolvedValue(1);

      const result = await service.getAllConsultants(1, 10, 'PROJECT_MANAGER');
      expect(result.consultants[0].costToCompanyRate).toBeUndefined();
    });

    it('should return correct primary skills', async () => {
      mockPrismaService.consultant.findMany.mockResolvedValue(mockConsultants);
      mockPrismaService.consultant.count.mockResolvedValue(1);

      const result = await service.getAllConsultants(1, 10, 'CONSULTANT_MANAGER');
      expect(result.consultants[0].primarySkills).toEqual(['TypeScript']);
    });

    it('should return empty list when no consultants exist', async () => {
      mockPrismaService.consultant.findMany.mockResolvedValue([]);
      mockPrismaService.consultant.count.mockResolvedValue(0);

      const result = await service.getAllConsultants(1, 10, 'CONSULTANT_MANAGER');
      expect(result.consultants).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return correct page number', async () => {
      mockPrismaService.consultant.findMany.mockResolvedValue([]);
      mockPrismaService.consultant.count.mockResolvedValue(0);

      const result = await service.getAllConsultants(3, 10, 'CONSULTANT_MANAGER');
      expect(result.page).toBe(3);
    });
  });

  // ─── getConsultantById ──────────────────────────────────────────────────────

  describe('getConsultantById', () => {
    it('should throw NotFoundException if consultant does not exist', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue(null);
      await expect(service.getConsultantById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return a mapped consultant profile DTO', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: 'uuid-1',

        phone: '0123456789',
        idNumber: '9901015555081',
        nationality: 'South African',
        addressLine1: '123 South road',
        addressLine2: null,
        suburb: 'Hillbrow',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2001',
        costToCompany: 50000,
        availability: 'AVAILABLE',
        user: { fullName: 'Jane Smith', email: 'jane@consultiq.com' },
        skills: [
          { skill: { name: 'TypeScript' }, competencyLevel: 'EXPERT', yearsExperience: 4, confidenceLevel: 4 },
        ],
        consultantExperiences: [],
        certificates: [],
        education: [],
      });

      const result = await service.getConsultantById('uuid-1');
      expect(result.id).toBe('uuid-1');
      expect(result.fullName).toBe('Jane Smith');
      expect(result.skills[0].skillName).toBe('TypeScript');
      expect(result.skills[0].competencyLevel).toBe('EXPERT');

      expect(result.skills[0].skillName).toBe('TypeScript');
      expect(result.skills[0].competencyLevel).toBe('EXPERT');
      expect(result.education).toEqual([]);
    });
  });

  // ─── getConsultantByUserId ──────────────────────────────────────────────────

  describe('getConsultantByUserId', () => {
    it('should throw NotFoundException if consultant does not exist for the given userId', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue(null);
      await expect(service.getConsultantByUserId('non-existent-user-id')).rejects.toThrow(NotFoundException);
    });

    it('should return a complete mapped consultant profile DTO when found by userId', async () => {
      const referenceDate = new Date();

      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: 'uuid-1',
        phone: '0123456789',
        idNumber: '9901015555081',
        nationality: 'South African',
        addressLine1: '123 South road',
        addressLine2: null,
        suburb: 'Hillbrow',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2001',
        costToCompany: 50000,
        availability: 'AVAILABLE',
        user: {
          fullName: 'Jane Smith',
          email: 'jane@consultiq.com'
        },
        skills: [
          {
            id: 'skill-1',
            competencyLevel: 'EXPERT',
            yearsExperience: 4,
            confidenceLevel: 4,
            skill: { name: 'TypeScript' }
          },
        ],
        consultantExperiences: [
          {
            id: 'exp-1',
            companyName: 'Tech Innovators',
            jobTitle: 'Senior Software Engineer',
            jobType: 'CONTRACT',
            startDate: referenceDate,
            endDate: null,
            description: 'Building microservices',
            workModel: 'HYBRID',
          },
        ],
        certificates: [
          {
            id: 'cert-1',
            title: 'AWS Solutions Architect',
            issuingBody: 'Amazon Web Services',
            startDate: null,
            endDate: referenceDate,
            uploadedAt: referenceDate,
          },
        ],
        education: [
          {
            id: 'edu-1',
            institution: 'University of Pretoria',
            qualification: 'BSc Computer Science',
            startDate: referenceDate,
            endDate: null,
          },
        ],
      });

      const result = await service.getConsultantByUserId('user-uuid-123');

      // Assert core profiles
      expect(result.id).toBe('uuid-1');
      expect(result.fullName).toBe('Jane Smith');
      expect(result.email).toBe('jane@consultiq.com');
      expect(result.phoneNumber).toBe('0123456789');
      expect(result.idNumber).toBe('9901015555081');
      expect(result.nationality).toBe('South African');
      expect(result.addressLine1).toBe('123 South road');
      expect(result.addressLine2).toBeNull;
      expect(result.suburb).toBe('Hillbrow');
      expect(result.city).toBe('Johannesburg');
      expect(result.province).toBe('Gauteng');
      expect(result.postalCode).toBe('2001');
      expect(result.costToCompany).toBe(50000);
      expect(result.availability).toBe('AVAILABLE');

      // Assert mapped complex data types (Skills)
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].id).toBe('skill-1');
      expect(result.skills[0].skillName).toBe('TypeScript');
      expect(result.skills[0].competencyLevel).toBe('EXPERT');
      expect(result.skills[0].yearsExperience).toBe(4);
      expect(result.skills[0].confidenceLevel).toBe(4);

      // Assert mapped complex data types (Experience)
      expect(result.experience).toHaveLength(1);
      expect(result.experience[0].id).toBe('exp-1');
      expect(result.experience[0].companyname).toBe('Tech Innovators');
      expect(result.experience[0].jobTitle).toBe('Senior Software Engineer');
      expect(result.experience[0].roleDescription).toBe('Building microservices');
      expect(result.experience[0].endDate).toBeNull();

      expect(result.certificates).toHaveLength(1);
      expect(result.certificates[0].id).toBe('cert-1');
      expect(result.certificates[0].title).toBe('AWS Solutions Architect');
      expect(result.certificates[0].startDate).toBeNull();
      expect(result.certificates[0].uploadedAt).toEqual(referenceDate);

      expect(result.education).toHaveLength(1);
      expect(result.education[0].id).toBe('edu-1');
      expect(result.education[0].institution).toBe('University of Pretoria');
      expect(result.education[0].qualification).toBe('BSc Computer Science');
      expect(result.education[0].startDate).toEqual(referenceDate);
      expect(result.education[0].endDate).toBeNull();
    });
  });

  //-------Consultant get assigned projects
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    consultant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    projectPlacement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    consultantManager: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },

    $transaction: jest.fn(),
  };

  describe('getAssignedProjects', () => {
    it('throws NotFoundException when consultant profile does not exist', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue(null);

      await expect(
        service.getAssignedProjects('user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns empty array when consultant has no placements', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({ id: 'consultant-1' });
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([]);

      const result = await service.getAssignedProjects('user-1');

      expect(result).toEqual([]);
    });

    it('returns assigned projects with team members excluding self', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({ id: 'consultant-1' });
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([
        {
          id: 'placement-1',
          status: 'ACTIVE',
          allocation: 80,
          startDate: new Date('2026-01-01'),
          endDate: null,
          project: {
            projectName: 'Project Alpha',
            clientName: 'Client A',
            description: 'Test project',
            suburb: 'Sandton',
            city: 'Johannesburg',
            province: 'Gauteng',
            status: 'IN_PROGRESS',
            startDate: new Date('2026-01-01'),
            endDate: null,
            allocation: 100,
            placements: [
              {
                consultantId: 'consultant-1',
                consultant: {
                  user: { fullName: 'Siya Sibiya', email: 'siya@bbd.co.za' },
                },
              },
              {
                consultantId: 'consultant-2',
                consultant: {
                  user: { fullName: 'Jane Doe', email: 'jane@bbd.co.za' },
                },
              },
            ],
          },
        },
      ]);

      const result = await service.getAssignedProjects('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].placementId).toBe('placement-1');
      expect(result[0].project.projectName).toBe('Project Alpha');
    });
  });

  describe('getAssignedProjectDetails', () => {
    it('throws NotFoundException when consultant profile does not exist', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue(null);

      await expect(
        service.getAssignedProjectDetails('user-1', 'project-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when consultant is not assigned to the project', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({ id: 'consultant-1' });
      mockPrismaService.projectPlacement.findFirst.mockResolvedValue(null);

      await expect(
        service.getAssignedProjectDetails('user-1', 'project-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns project details with team members excluding self', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({ id: 'consultant-1' });
      mockPrismaService.projectPlacement.findFirst.mockResolvedValue({
        id: 'placement-1',
        status: 'ACTIVE',
        allocation: 80,
        startDate: new Date('2026-01-01'),
        endDate: null,
        project: {
          id: 'project-1',
          projectName: 'Project Alpha',
          clientName: 'Client A',
          description: 'Test',
          addressLine1: '123 Main St',
          addressLine2: null,
          suburb: 'Sandton',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '2196',
          status: 'IN_PROGRESS',
          startDate: new Date('2026-01-01'),
          endDate: null,
          teamSize: 3,
          allocation: 100,
          budget: 500000,
          skills: [
            {
              competency: 'EXPERT',
              years: 3,
              mandatory: true,
              skill: { name: 'TypeScript' },
            },
          ],
          placements: [
            {
              consultantId: 'consultant-1',
              consultant: {
                user: { fullName: 'Siya Sibiya', email: 'siya@bbd.co.za' },
              },
            },
            {
              consultantId: 'consultant-2',
              consultant: {
                user: { fullName: 'Jane Doe', email: 'jane@bbd.co.za' },
              },
            },
          ],
        },
      });

      const result = await service.getAssignedProjectDetails('user-1', 'project-1');

      expect(result.placementId).toBe('placement-1');
      expect(result.project.projectName).toBe('Project Alpha');
      expect(result.project.skills).toHaveLength(1);
      expect(result.project.skills[0].skillName).toBe('TypeScript');
      expect(result.project.teamMembers).toHaveLength(1);
      expect(result.project.teamMembers[0].email).toBe('jane@bbd.co.za');
    });
  });

  //-------------------------------------Update consultant profile---------------------------------------------------------------------
  describe('updateConsultantProfile', () => {
    const consultantId = 'consultant-uuid-1';

    it('should throw NotFoundException if consultant does not exist', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateConsultantProfile(consultantId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update basic fields without touching skills, experiences or certifications', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
      });
      mockPrismaService.$transaction.mockResolvedValue([{}]);

      const result = await service.updateConsultantProfile(consultantId, {
        phone: '0821234567',
        nationality: 'South African',
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(result.message).toBe('Consultant profile updated successfully.');
    });

    it('should replace all skills when provided', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
      });

      const txMock = {
        consultant: { update: jest.fn().mockResolvedValue({}) },
        consultantSkill: {
          deleteMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({}),
        },
        skill: {
          upsert: jest.fn().mockResolvedValue({ id: 'skill-uuid-1' }),
        },
        consultantExperience: { deleteMany: jest.fn(), create: jest.fn() },
        certificate: { deleteMany: jest.fn(), create: jest.fn() },
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: typeof txMock) => Promise<void>) => fn(txMock),
      );

      await service.updateConsultantProfile(consultantId, {
        skills: [
          { skillName: 'TypeScript', yearsExperience: 5, confidenceLevel: 4 },
        ],
      });

      expect(txMock.consultantSkill.deleteMany).toHaveBeenCalledWith({
        where: { consultantId },
      });
      expect(txMock.consultantSkill.create).toHaveBeenCalledTimes(1);
    });

    it('should recompute competency level', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
      });

      let capturedSkillData: any = null;

      const txMock = {
        consultant: { update: jest.fn().mockResolvedValue({}) },
        consultantSkill: {
          deleteMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockImplementation((args) => {
            capturedSkillData = args.data;
            return Promise.resolve({});
          }),
        },
        skill: {
          upsert: jest.fn().mockResolvedValue({ id: 'skill-uuid-1' }),
        },
        consultantExperience: { deleteMany: jest.fn(), create: jest.fn() },
        certificate: { deleteMany: jest.fn(), create: jest.fn() },
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: typeof txMock) => Promise<void>) => fn(txMock),
      );

      await service.updateConsultantProfile(consultantId, {
        skills: [
          { skillName: 'React', yearsExperience: 5, confidenceLevel: 4 },
        ],
      });

      expect(capturedSkillData.competencyLevel).toBe('EXPERT');
    });

    it('should replace all experiences when provided', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
      });

      const txMock = {
        consultant: { update: jest.fn().mockResolvedValue({}) },
        consultantSkill: { deleteMany: jest.fn(), create: jest.fn() },
        skill: { upsert: jest.fn() },
        consultantExperience: {
          deleteMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({}),
        },
        certificate: { deleteMany: jest.fn(), create: jest.fn() },
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: typeof txMock) => Promise<void>) => fn(txMock),
      );

      await service.updateConsultantProfile(consultantId, {
        experiences: [
          {
            jobTitle: 'Developer',
            companyName: 'ConsultIQ',
            jobType: 'FULL_TIME',
            workModel: 'REMOTE',
            startDate: '2022-01-01T00:00:00.000Z',
            description: 'Built things.',
          },
        ],
      });

      expect(txMock.consultantExperience.deleteMany).toHaveBeenCalledWith({
        where: { consultantId },
      });
      expect(txMock.consultantExperience.create).toHaveBeenCalledTimes(1);
    });

    it('should replace all certifications  provided', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
      });

      const txMock = {
        consultant: { update: jest.fn().mockResolvedValue({}) },
        consultantSkill: { deleteMany: jest.fn(), create: jest.fn() },
        skill: { upsert: jest.fn() },
        consultantExperience: { deleteMany: jest.fn(), create: jest.fn() },
        certificate: {
          deleteMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: typeof txMock) => Promise<void>) => fn(txMock),
      );

      await service.updateConsultantProfile(consultantId, {
        certifications: [
          { title: 'AWS Certified Developer', issuingBody: 'Amazon' },
        ],
      });

      expect(txMock.certificate.deleteMany).toHaveBeenCalledWith({
        where: { consultantId },
      });
      expect(txMock.certificate.create).toHaveBeenCalledTimes(1);
    });

    it('should replace all education entries when provided', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
      });

      const txMock = {
        consultant: { update: jest.fn().mockResolvedValue({}) },
        consultantSkill: { deleteMany: jest.fn(), create: jest.fn() },
        skill: { upsert: jest.fn() },
        consultantExperience: { deleteMany: jest.fn(), create: jest.fn() },
        certificate: { deleteMany: jest.fn(), create: jest.fn() },
        consultantEducation: {
          deleteMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: typeof txMock) => Promise<void>) => fn(txMock),
      );

      await service.updateConsultantProfile(consultantId, {
        education: [
          {
            institution: 'University of Pretoria',
            qualification: 'BSc Computer Science',
            startDate: '2022-01-01T00:00:00.000Z',
            endDate: '2025-12-01T00:00:00.000Z',
          },
        ],
      });

      expect(txMock.consultantEducation.deleteMany).toHaveBeenCalledWith({
        where: { consultantId },
      });
      expect(txMock.consultantEducation.create).toHaveBeenCalledTimes(1);
    });

    it('should not touch education when not provided', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
      });

      const txMock = {
        consultant: { update: jest.fn().mockResolvedValue({}) },
        consultantSkill: { deleteMany: jest.fn(), create: jest.fn() },
        skill: { upsert: jest.fn() },
        consultantExperience: { deleteMany: jest.fn(), create: jest.fn() },
        certificate: { deleteMany: jest.fn(), create: jest.fn() },
        consultantEducation: {
          deleteMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: typeof txMock) => Promise<void>) => fn(txMock),
      );

      await service.updateConsultantProfile(consultantId, {
        phone: '0821234567',
      });

      expect(txMock.consultantEducation.deleteMany).not.toHaveBeenCalled();
      expect(txMock.consultantEducation.create).not.toHaveBeenCalled();
    });

    it('should update address fields when provided', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
      });

      const updateSpy = jest.fn().mockResolvedValue({});
      const txMock = {
        consultant: { update: updateSpy },
        consultantSkill: { deleteMany: jest.fn(), create: jest.fn() },
        skill: { upsert: jest.fn() },
        consultantExperience: { deleteMany: jest.fn(), create: jest.fn() },
        certificate: { deleteMany: jest.fn(), create: jest.fn() },
        consultantEducation: { deleteMany: jest.fn(), create: jest.fn() },
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: typeof txMock) => Promise<void>) => fn(txMock),
      );

      await service.updateConsultantProfile(consultantId, {
        addressLine1: '742 Evergreen Terrace',
        city: 'Pretoria',
        province: 'Gauteng',
      });

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: consultantId },
        data: expect.objectContaining({
          addressLine1: '742 Evergreen Terrace',
          city: 'Pretoria',
          province: 'Gauteng',
        }),
      });
    });

    it('should update availability status when provided', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
      });

      const updateSpy = jest.fn().mockResolvedValue({});
      const txMock = {
        consultant: { update: updateSpy },
        consultantSkill: { deleteMany: jest.fn(), create: jest.fn() },
        skill: { upsert: jest.fn() },
        consultantExperience: { deleteMany: jest.fn(), create: jest.fn() },
        certificate: { deleteMany: jest.fn(), create: jest.fn() },
        consultantEducation: { deleteMany: jest.fn(), create: jest.fn() },
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: typeof txMock) => Promise<void>) => fn(txMock),
      );

      await service.updateConsultantProfile(consultantId, {
        availability: 'UNAVAILABLE',
      });

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: consultantId },
        data: expect.objectContaining({
          availability: 'UNAVAILABLE',
        }),
      });
    });
  });

  // ---------- uploadProfilePicture------------
  describe('uploadProfilePicture', () => {
    const consultantId = 'consultant-uuid-1';
    const userId = 'user-uuid-1';
    const mockFile = {
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('fake-image-data'),
    } as Express.Multer.File;

    it('should throw BadRequestException for an unsupported mime type', async () => {
      const badFile = { ...mockFile, mimetype: 'application/pdf' };
      await expect(
        service.uploadProfilePicture(consultantId, userId, 'CONSULTANT', badFile as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when the file exceeds the size limit', async () => {
      const oversizedFile = { ...mockFile, size: 6 * 1024 * 1024 };
      await expect(
        service.uploadProfilePicture(consultantId, userId, 'CONSULTANT', oversizedFile as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if the consultant does not exist', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadProfilePicture(consultantId, userId, 'CONSULTANT',mockFile),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if a non-managing CONSULTANT_MANAGER tries to upload', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
        userId: 'a-different-user',
      });

      mockPrismaService.consultantManager.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadProfilePicture(consultantId, userId, 'CONSULTANT',mockFile),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if thr caller is neither a consultant nor a consultant manger', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
        userId: 'a-different-user',
      });

      await expect(
        service.uploadProfilePicture(consultantId, userId, 'PROJECT_MANAGER', mockFile),
      ).rejects.toThrow(ForbiddenException);
    })

    it('should upload successfully when the consultant uploads their own picture', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
        userId,
      });

      mockPrismaService.consultant.update.mockResolvedValue({});

      const result = await service.uploadProfilePicture(consultantId, userId, 'CONSULTANT', mockFile);

      expect(mockPrismaService.consultantManager.findUnique).not.toHaveBeenCalledWith();
      expect(mockPrismaService.consultant.update).toHaveBeenCalledWith({
        where: { id: consultantId},
        data: {
          pictureData: expect.any(Uint8Array),
          pictureMimeType: 'image/jpeg',
        },
      });
      expect(result.message).toBe('Profile picture uploaded successfully.');
      expect(result.pictureUrl).toBe(`data:image/jpeg;base64,${mockFile.buffer.toString('base64')}`);
    });

    it('should upload successfully when the managing CONSULTANT_MANAGER uploads on the consultant\'s behalf', async () => {
      mockPrismaService.consultant.findUnique.mockResolvedValue({
        id: consultantId,
        userId: 'a-different-user',
      });
      mockPrismaService.consultantManager.findUnique.mockResolvedValue({ id: 'link-1 '});
      mockPrismaService.consultant.update.mockResolvedValue({});

      const result = await service.uploadProfilePicture(consultantId, userId, 'CONSULTANT_MANAGER', mockFile);

      expect(mockPrismaService.consultantManager.findUnique).toHaveBeenCalledWith({
        where: { userId_consultantId: { userId, consultantId } },
      });
      expect(result.message).toBe('Profile picture uploaded successfully.');
    });
  });
});