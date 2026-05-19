import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ConsultantService } from '../services/consultant.service';
import { ConsultantRepository } from '../repositories/consultant.repository';
import { CreateConsultantDto, CreateConsultantSkillDto, CreateCertificationDto } from '../dto/create-consultant.dto';

const mockConsultantRepository = {
  findEmail: jest.fn(),
  createConsultant: jest.fn(),
};

const mockDto: CreateConsultantDto = {
  fullName: 'Jane Smith',
  email: 'jane@consultiq.com',
  location: 'Johannesburg, Gauteng',
  costToCompanyRate: 650,
  availabilityStatus: 'AVAILABLE',
  skills: [
    { 
        skillName: 'Java', 
        yearsExperience: 4, 
        confidenceLevel: 8 
    } as CreateConsultantSkillDto,
  ],
  certifications: [
    { certificationName: 'AWS Certified', issuingBody: 'AWS' } as CreateCertificationDto,
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
  // Happy path
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

    // Duplicate email
    it('should throw ConflictException if email already exists', async () => {
      mockConsultantRepository.findEmail.mockResolvedValue({
        id: 'existing-uuid',
        email: mockDto.email,
      });

      await expect(service.createConsultant(mockDto)).rejects.toThrow(ConflictException);
      expect(mockConsultantRepository.createConsultant).not.toHaveBeenCalled();
    });

    // Transaction rollback
    it('should throw error and not save if transaction fails', async () => {
      mockConsultantRepository.findEmail.mockResolvedValue(null);
      mockConsultantRepository.createConsultant.mockRejectedValue(
        new Error('Transaction failed'),
      );

      await expect(service.createConsultant(mockDto)).rejects.toThrow('Transaction failed');
    });
  });
});