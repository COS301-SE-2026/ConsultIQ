import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConsultantService } from '../services/consultant.service';
import { ConsultantRepository } from '../repositories/consultant.repository';
import { CreateConsultantDto, CreateConsultantSkillDto, CreateCertificationDto } from '../dto/create-consultant.dto';

const mockConsultantRepository = {
  findEmail: jest.fn(),
  createConsultant: jest.fn(),
  getConsultantById: jest.fn(),
};

const mockDto: CreateConsultantDto = {
  fullName: 'Jane Smith',
  email: 'jane@consultiq.com',
  location: 'Johannesburg, Gauteng',
  costToCompanyRate: 650,
  availabilityStatus: 'AVAILABLE',
  skills: [
    { skillName: 'Java', yearsExperience: 4, confidenceLevel: 8 } as CreateConsultantSkillDto,
  ],
  certifications: [
    { certificationName: 'AWS Certified', issuingBody: 'AWS' } as CreateCertificationDto,
  ],
};

const mockConsultant = {
  id: 'uuid-123',
  location: 'Johannesburg, Gauteng',
  costToCompany: 650,
  availability: 'AVAILABLE',
  user: {
    fullName: 'Jane Smith',
    email: 'jane@consultiq.com',
  },
  skills: [
    {
      skill: { name: 'java' },
      competencyLevel: 'BEGINNER',
      yearsExperience: 4,
      confidenceLevel: 8,
    },
  ],
  certificates: [
    {
      title: 'AWS Certified',
      issuingBody: 'AWS',
      uploadedAt: new Date('2026-01-01'),
    },
  ],
};

describe('ConsultantService', () => {
  let service: ConsultantService;

  beforeEach(async () => {
    try {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConsultantService,
          { provide: ConsultantRepository, useValue: mockConsultantRepository },
        ],
      }).compile();
      service = module.get<ConsultantService>(ConsultantService);
      jest.clearAllMocks();
    } catch (error) {
      console.error('Module compile error:', error);
      throw error;
    }
  });

  describe('createConsultant', () => {
    it('should create a consultant successfully', async () => {
      mockConsultantRepository.findEmail.mockResolvedValue(null);
      mockConsultantRepository.createConsultant.mockResolvedValue({
        consultantId: 'uuid-123',
      });
      const result = await service.createConsultant(mockDto);
      expect(result).toEqual({
        message: 'Consultant created successfully',
        consultantId: 'uuid-123',
      });
      expect(mockConsultantRepository.findEmail).toHaveBeenCalledWith(mockDto.email);
      expect(mockConsultantRepository.createConsultant).toHaveBeenCalledWith(mockDto);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockConsultantRepository.findEmail.mockResolvedValue({
        id: 'existing-uuid',
        email: mockDto.email,
      });
      await expect(service.createConsultant(mockDto)).rejects.toThrow(ConflictException);
      expect(mockConsultantRepository.createConsultant).not.toHaveBeenCalled();
    });

    it('should throw error and not save if transaction fails', async () => {
      mockConsultantRepository.findEmail.mockResolvedValue(null);
      mockConsultantRepository.createConsultant.mockRejectedValue(
        new Error('Transaction failed'),
      );
      await expect(service.createConsultant(mockDto)).rejects.toThrow('Transaction failed');
    });
  });

  describe('getConsultantById', () => {
    it('should return consultant profile when found', async () => {
      mockConsultantRepository.getConsultantById.mockResolvedValue(mockConsultant);

      const result = await service.getConsultantById('uuid-123');

      expect(result).toEqual({
        id: 'uuid-123',
        fullName: 'Jane Smith',
        email: 'jane@consultiq.com',
        location: 'Johannesburg, Gauteng',
        availability: 'AVAILABLE',
        costToCompany: 650,
        skills: [
          {
            skillName: 'java',
            competencyLevel: 'BEGINNER',
            yearsExperience: 4,
            confidenceLevel: 8,
          },
        ],
        certificates: [
          {
            title: 'AWS Certified',
            issuingBody: 'AWS',
            uploadedAt: new Date('2026-01-01'),
          },
        ],
      });
      expect(mockConsultantRepository.getConsultantById).toHaveBeenCalledWith('uuid-123');
    });

    it('should throw NotFoundException when consultant not found', async () => {
      mockConsultantRepository.getConsultantById.mockResolvedValue(null);

      await expect(service.getConsultantById('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.getConsultantById('non-existent-id')).rejects.toThrow(
        'Consultant with id non-existent-id not found.',
      );
    });

    it('should correctly map skills', async () => {
      mockConsultantRepository.getConsultantById.mockResolvedValue(mockConsultant);

      const result = await service.getConsultantById('uuid-123');

      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].skillName).toBe('java');
      expect(result.skills[0].competencyLevel).toBe('BEGINNER');
    });

    it('should correctly map certificates', async () => {
      mockConsultantRepository.getConsultantById.mockResolvedValue(mockConsultant);

      const result = await service.getConsultantById('uuid-123');

      expect(result.certificates).toHaveLength(1);
      expect(result.certificates[0].title).toBe('AWS Certified');
    });
  });
});