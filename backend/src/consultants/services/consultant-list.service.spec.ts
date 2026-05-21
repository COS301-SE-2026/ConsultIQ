import { Test, TestingModule } from '@nestjs/testing';
import { ConsultantService } from '../services/consultant.service';
import { ConsultantRepository } from '../repositories/consultant.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockConsultants = [
  {
    id: 'uuid-1',
    location: 'Johannesburg',
    availability: 'AVAILABLE',
    costToCompany: 650,
    user: { fullName: 'Jane Smith', email: 'jane@consultiq.com' },
    skills: [{ skill: { name: 'java' } }, { skill: { name: 'react' } }],
  },
];

const mockConsultantRecord = {
  id: 'consultant-uuid-123',
  userId: 'user-uuid-456',
  phone: '+27 82 000 0000',
  idNumber: '9001010000000',
  nationality: 'South African',
  location: 'Johannesburg',
  costToCompany: 75000,
  availability: 'AVAILABLE',
  user: {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
  },
  skills: [
    {
      competencyLevel: 'INTERMEDIATE',
      yearsExperience: 3,
      confidenceLevel: 7,
      skill: { name: 'typescript' },
    },
  ],
  consultantExperiences: [
    {
      companyName: 'Acme Corp',
      jobTitle: 'Software Engineer',
      jobType: 'FULL_TIME',
      startDate: new Date('2021-01-01'),
      endDate: new Date('2023-06-30'),
      description: 'Worked on backend APIs.',
      workModel: 'REMOTE',
    },
  ],
  certificates: [
    {
      title: 'AWS Certified Developer',
      issuingBody: 'Amazon',
      startDate: new Date('2022-03-01'),
      endDate: new Date('2025-03-01'),
      uploadedAt: new Date('2022-03-05'),
    },
  ],
};

const mockConsultantRepository = {
  findEmail: jest.fn(),
  createConsultant: jest.fn(),
  getAllConsultants: jest.fn(),
  getConsultantById: jest.fn(),
  getConsultantByUserId: jest.fn(),
};

describe('ConsultantService - getAllConsultants', () => {
  let service: ConsultantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultantService,
        { provide: ConsultantRepository, useValue: mockConsultantRepository },
      ],
    }).compile();

    service = module.get<ConsultantService>(ConsultantService);
    jest.clearAllMocks();
  });

  it('should return consultants with CTC for Consultant Manager', async () => {
    mockConsultantRepository.getAllConsultants.mockResolvedValue({
      consultants: mockConsultants,
      total: 1,
    });

    const result = await service.getAllConsultants(1, 10, 'CONSULTANT_MANAGER');

    expect(result.consultants[0].costToCompanyRate).toBe(650);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it('should strip CTC for Project Manager', async () => {
    mockConsultantRepository.getAllConsultants.mockResolvedValue({
      consultants: mockConsultants,
      total: 1,
    });

    const result = await service.getAllConsultants(1, 10, 'PROJECT_MANAGER');

    expect(result.consultants[0].costToCompanyRate).toBeUndefined();
  });

  it('should return correct primary skills', async () => {
    mockConsultantRepository.getAllConsultants.mockResolvedValue({
      consultants: mockConsultants,
      total: 1,
    });

    const result = await service.getAllConsultants(1, 10, 'CONSULTANT_MANAGER');

    expect(result.consultants[0].primarySkills).toEqual(['java', 'react']);
  });

  it('should return empty list when no consultants', async () => {
    mockConsultantRepository.getAllConsultants.mockResolvedValue({
      consultants: [],
      total: 0,
    });

    const result = await service.getAllConsultants(1, 10, 'CONSULTANT_MANAGER');

    expect(result.consultants).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should create a consultant successfully', async () => {
    mockConsultantRepository.findEmail.mockResolvedValue(null);
    mockConsultantRepository.createConsultant.mockResolvedValue({
      consultantId: 'uuid-123',
    });

    const mockDto = {
      fullName: 'Jane Smith',
      email: 'jane@consultiq.com',
      location: 'Johannesburg',
      costToCompanyRate: 650,
      availabilityStatus: 'AVAILABLE',
      skills: [],
      certifications: [],
    };

    const result = await service.createConsultant(mockDto as any);
    expect(result.message).toBe('Consultant created successfully');
    expect(result.consultantId).toBe('uuid-123');
  });

  it('should throw ConflictException if email already exists', async () => {
    mockConsultantRepository.findEmail.mockResolvedValue({ id: 'existing' });

    const mockDto = {
      fullName: 'Jane Smith',
      email: 'jane@consultiq.com',
      location: 'Johannesburg',
      costToCompanyRate: 650,
      availabilityStatus: 'AVAILABLE',
      skills: [],
      certifications: [],
    };

    await expect(service.createConsultant(mockDto as any)).rejects.toThrow(ConflictException);
  });

  // -------------------------------------------------------------------------
  // getConsultantById
  // -------------------------------------------------------------------------
  describe('getConsultantById', () => {
    it('should return a mapped ConsultantProfileDto when the consultant exists', async () => {
      mockConsultantRepository.getConsultantById.mockResolvedValue(mockConsultantRecord);

      const result = await service.getConsultantById('consultant-uuid-123');

      expect(mockConsultantRepository.getConsultantById).toHaveBeenCalledWith('consultant-uuid-123');
      expect(result.id).toBe('consultant-uuid-123');
      expect(result.fullName).toBe('Jane Doe');
      expect(result.email).toBe('jane.doe@example.com');
      expect(result.location).toBe('Johannesburg');
      expect(result.costToCompany).toBe(75000);
      expect(result.availability).toBe('AVAILABLE');
    });

    it('should throw NotFoundException when consultant does not exist', async () => {
      mockConsultantRepository.getConsultantById.mockResolvedValue(null);

      await expect(service.getConsultantById('non-existent-id')).rejects.toThrow(
        new NotFoundException('Consultant with id non-existent-id not found.'),
      );
    });

    it('should map skills correctly', async () => {
      mockConsultantRepository.getConsultantById.mockResolvedValue(mockConsultantRecord);

      const result = await service.getConsultantById('consultant-uuid-123');

      expect(result.skills[0]).toEqual({
        skillName: 'typescript',
        competencyLevel: 'INTERMEDIATE',
        yearsExperience: 3,
        confidenceLevel: 7,
      });
    });

    it('should map experience correctly', async () => {
      mockConsultantRepository.getConsultantById.mockResolvedValue(mockConsultantRecord);

      const result = await service.getConsultantById('consultant-uuid-123');

      expect(result.experience[0]).toEqual({
        companyname: 'Acme Corp',
        jobTitle: 'Software Engineer',
        jobType: 'FULL_TIME',
        startDate: new Date('2021-01-01'),
        endDate: new Date('2023-06-30'),
        roleDescription: 'Worked on backend APIs.',
        workModel: 'REMOTE',
      });
    });


    it('should fall back to current date when experience endDate is null', async () => {
      const before = new Date();
      mockConsultantRepository.getConsultantById.mockResolvedValue({
        ...mockConsultantRecord,
        consultantExperiences: [
          { ...mockConsultantRecord.consultantExperiences[0], endDate: null },
        ],
      });

      const result = await service.getConsultantById('consultant-uuid-123');
      const after = new Date();

      expect(result.experience[0].endDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.experience[0].endDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should fall back to current date when certificate startDate or endDate is null', async () => {
      const before = new Date();
      mockConsultantRepository.getConsultantById.mockResolvedValue({
        ...mockConsultantRecord,
        certificates: [{ ...mockConsultantRecord.certificates[0], startDate: null, endDate: null }],
      });

      const result = await service.getConsultantById('consultant-uuid-123');
      const after = new Date();

      expect(result.certificates[0].startDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.certificates[0].endDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // -------------------------------------------------------------------------
  // getConsultantByUserId
  // -------------------------------------------------------------------------
  describe('getConsultantByUserId', () => {
    it('should return a mapped ConsultantProfileDto when the consultant exists', async () => {
      mockConsultantRepository.getConsultantByUserId.mockResolvedValue(mockConsultantRecord);

      const result = await service.getConsultantByUserId('user-uuid-456');

      expect(mockConsultantRepository.getConsultantByUserId).toHaveBeenCalledWith('user-uuid-456');
      expect(result.id).toBe('consultant-uuid-123');
      expect(result.fullName).toBe('Jane Doe');
      expect(result.email).toBe('jane.doe@example.com');
      expect(result.location).toBe('Johannesburg');
      expect(result.costToCompany).toBe(75000);
      expect(result.availability).toBe('AVAILABLE');
    });

    it('should throw NotFoundException when no consultant matches the userId', async () => {
      mockConsultantRepository.getConsultantByUserId.mockResolvedValue(null);

      await expect(service.getConsultantByUserId('non-existent-user-id')).rejects.toThrow(
        new NotFoundException('Consultant with userId non-existent-user-id not found.'),
      );
    });

    it('should map skills correctly', async () => {
      mockConsultantRepository.getConsultantByUserId.mockResolvedValue(mockConsultantRecord);

      const result = await service.getConsultantByUserId('user-uuid-456');

      expect(result.skills[0]).toEqual({
        skillName: 'typescript',
        competencyLevel: 'INTERMEDIATE',
        yearsExperience: 3,
        confidenceLevel: 7,
      });
    });

    it('should map experience correctly', async () => {
      mockConsultantRepository.getConsultantByUserId.mockResolvedValue(mockConsultantRecord);

      const result = await service.getConsultantByUserId('user-uuid-456');

      expect(result.experience[0]).toEqual({
        companyname: 'Acme Corp',
        jobTitle: 'Software Engineer',
        jobType: 'FULL_TIME',
        startDate: new Date('2021-01-01'),
        endDate: new Date('2023-06-30'),
        roleDescription: 'Worked on backend APIs.',
        workModel: 'REMOTE',
      });
    });

    it('should fall back to current date when experience endDate is null', async () => {
      const before = new Date();
      mockConsultantRepository.getConsultantByUserId.mockResolvedValue({
        ...mockConsultantRecord,
        consultantExperiences: [
          { ...mockConsultantRecord.consultantExperiences[0], endDate: null },
        ],
      });

      const result = await service.getConsultantByUserId('user-uuid-456');
      const after = new Date();

      expect(result.experience[0].endDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.experience[0].endDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should fall back to current date when certificate startDate or endDate is null', async () => {
      const before = new Date();
      mockConsultantRepository.getConsultantByUserId.mockResolvedValue({
        ...mockConsultantRecord,
        certificates: [{ ...mockConsultantRecord.certificates[0], startDate: null, endDate: null }],
      });

      const result = await service.getConsultantByUserId('user-uuid-456');
      const after = new Date();

      expect(result.certificates[0].startDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.certificates[0].endDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    
  });
});