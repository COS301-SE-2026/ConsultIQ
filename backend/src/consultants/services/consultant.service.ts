import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConsultantRepository } from '../repositories/consultant.repository';
import { CreateConsultantDto } from '../dto/create-consultant.dto';
import {
  ConsultantListItemDto,
  PaginatedConsultantsResponseDto,
} from '../dto/consultant-list.dto';
import { ConsultantProfileDto } from '../dto/consultant-profile.dto';

@Injectable()
export class ConsultantService {
  constructor(private readonly consultantRepository: ConsultantRepository) {}

  async createConsultant(dto: CreateConsultantDto) {
    const existingUser = await this.consultantRepository.findEmail(dto.email);
    if (existingUser) {
      throw new ConflictException(
        'A consultant with this email already exists.',
      );
    }

    const result = await this.consultantRepository.createConsultant(dto);

    return {
      message: 'Consultant created successfully',
      consultantId: result.consultantId,
    };
  }

  async getAllConsultants(
    page: number,
    limit: number,
    role?: string,
  ): Promise<PaginatedConsultantsResponseDto> {
    const { consultants, total } = await this.consultantRepository.getAllConsultants(page, limit);

    const mappedConsultants: ConsultantListItemDto[] = consultants.map(
      (consultant) => {
        const dto: ConsultantListItemDto = {
          id: consultant.id.toString(),
          fullName: consultant.user.fullName,
          email: consultant.user.email,
          location: consultant.location,
          availabilityStatus:
            consultant.availability === 'AVAILABLE'
              ? 'Available'
              : 'Unavailable',
          primarySkills: consultant.skills.map((cs) => cs.skill.name),
          costToCompanyRate:
            role === 'PROJECT_MANAGER' ? undefined : consultant.costToCompany,
          phone: consultant.phone,
          idNumber: consultant.idNumber,
          experienceYears: consultant.skills.reduce(
            (max, cs) => Math.max(max, cs.yearsExperience),
            0,
          ),
          certifications:
            consultant.certificates?.map((cert) => cert.title) || [],
        };

        return dto;
      },
    );

    return {
      page,
      total,
      consultants: mappedConsultants,
    };
  }

  async getConsultantById(id: string): Promise<ConsultantProfileDto> {
    const consultant = await this.consultantRepository.getConsultantById(id);

    if (!consultant) {
      throw new NotFoundException(`Consultant with id ${id} not found.`);
    }

    return {
      id: consultant.id,
      fullName: consultant.user.fullName,
      email: consultant.user.email,
      phoneNumber: consultant.phone ?? '',
      idNumber: consultant.idNumber ?? '',
      nationality: consultant.nationality ?? '',
      location: consultant.location,
      costToCompany: consultant.costToCompany,
      availability: consultant.availability,

      skills: consultant.skills.map((cs) => ({
        id: cs.id,
        skillName: cs.skill.name,
        competencyLevel: cs.competencyLevel,
        yearsExperience: cs.yearsExperience,
        confidenceLevel: cs.confidenceLevel,
      })),

      experience: consultant.consultantExperiences.map((exp) => ({
        id: exp.id,
        companyname: exp.companyName,
        jobTitle: exp.jobTitle,
        jobType: exp.jobType,
        startDate: exp.startDate,
        endDate: exp.endDate ?? new Date(),
        roleDescription: exp.description,
        workModel: exp.workModel,
      })),

      certificates: consultant.certificates.map((cert) => ({
        id: cert.id,
        title: cert.title,
        issuingBody: cert.issuingBody,
        startDate: cert.startDate ?? new Date(),
        endDate: cert.endDate ?? new Date(),
        uploadedAt: cert.uploadedAt,
      })),
    };
  }

  async getConsultantByUserId(userId: string): Promise<ConsultantProfileDto> {
    const consultant = await this.consultantRepository.getConsultantByUserId(userId);

    if (!consultant) {
      throw new NotFoundException(`Consultant with userId ${userId} not found.`);
    }

    return {
      id: consultant.id,
      fullName: consultant.user.fullName,
      email: consultant.user.email,
      phoneNumber: consultant.phone ?? '',
      idNumber: consultant.idNumber ?? '',
      nationality: consultant.nationality ?? '',
      location: consultant.location,
      costToCompany: consultant.costToCompany,
      availability: consultant.availability,

      skills: consultant.skills.map((cs) => ({
        id: cs.id,
        skillName: cs.skill.name,
        competencyLevel: cs.competencyLevel,
        yearsExperience: cs.yearsExperience,
        confidenceLevel: cs.confidenceLevel,
      })),

      experience: consultant.consultantExperiences.map((exp) => ({
        id: exp.id,
        companyname: exp.companyName,
        jobTitle: exp.jobTitle,
        jobType: exp.jobType,
        startDate: exp.startDate,
        endDate: exp.endDate ?? new Date(),
        roleDescription: exp.description,
        workModel: exp.workModel,
      })),

      certificates: consultant.certificates.map((cert) => ({
        id: cert.id,
        title: cert.title,
        issuingBody: cert.issuingBody,
        startDate: cert.startDate ?? new Date(),
        endDate: cert.endDate ?? new Date(),
        uploadedAt: cert.uploadedAt,
      })),
    };
  }
}
    

