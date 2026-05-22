import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConsultantService } from './consultant.service';
import { PrismaService } from '../../prisma/prisma.service';

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

describe('ConsultantService', () => {
  let service: ConsultantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultantService,
        { provide: PrismaService, useValue: mockPrismaService },
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
      location: 'Johannesburg',
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
        location: 'Johannesburg',
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
        location: 'Johannesburg',
        costToCompany: 50000,
        availability: 'AVAILABLE',
        user: { fullName: 'Jane Smith', email: 'jane@consultiq.com' },
        skills: [
          { skill: { name: 'TypeScript' }, competencyLevel: 'EXPERT', yearsExperience: 4, confidenceLevel: 4 },
        ],
        consultantExperiences: [],
        certificates: [],
      });

      const result = await service.getConsultantById('uuid-1');
      expect(result.id).toBe('uuid-1');
      expect(result.fullName).toBe('Jane Smith');
      expect(result.skills[0].skillName).toBe('TypeScript');
      expect(result.skills[0].competencyLevel).toBe('EXPERT');
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
        location: 'Johannesburg',
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
      });

      const result = await service.getConsultantByUserId('user-uuid-123');

      // Assert core profiles
      expect(result.id).toBe('uuid-1');
      expect(result.fullName).toBe('Jane Smith');
      expect(result.email).toBe('jane@consultiq.com');
      expect(result.phoneNumber).toBe('0123456789');
      expect(result.idNumber).toBe('9901015555081');
      expect(result.nationality).toBe('South African');
      expect(result.location).toBe('Johannesburg');
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
    });
  });
});