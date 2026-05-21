import { ConflictException, Injectable } from '@nestjs/common';
import { ConsultantRepository } from '../repositories/consultant.repository';
import { CreateConsultantDto } from '../dto/create-consultant.dto';
import {
  ConsultantListItemDto,
  PaginatedConsultantsResponseDto,
} from '../dto/consultant-list.dto';

@Injectable()
export class ConsultantService {
  constructor(private readonly consultantRepository: ConsultantRepository) {}

  async createConsultant(dto: CreateConsultantDto) {
    //This function is for email duplication check
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
  ): Promise<PaginatedConsultantsResponseDto> {
    const { consultants, total } =
      await this.consultantRepository.getAllConsultants(page, limit);

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
          costToCompanyRate: consultant.costToCompany,
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
}
