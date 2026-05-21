import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConsultantRepository } from "../repositories/consultant.repository";
import { ConsultantListItemDto, PaginatedConsultantsResponseDto,CreateConsultantDto } from "../dto/create-consultant.dto";
import { ConsultantProfileDto } from "../dto/consultant-profile.dto";

@Injectable()
export class ConsultantService {
  constructor(private readonly consultantRepository: ConsultantRepository) {}

  async createConsultant(dto: CreateConsultantDto) {
    const existingUser = await this.consultantRepository.findEmail(dto.email);
    if (existingUser) {
      throw new ConflictException("A consultant with this email already exists.");
    }
    const result = await this.consultantRepository.createConsultant(dto);
    return {
      message: "Consultant created successfully",
      consultantId: result.consultantId,
    };
  }

  async getAllConsultants(page: number, limit: number, userRole: string): Promise<PaginatedConsultantsResponseDto> {
    const { consultants, total } = await this.consultantRepository.getAllConsultants(page, limit);
    const mappedConsultants: ConsultantListItemDto[] = consultants.map((consultant) => {
      const dto: ConsultantListItemDto = {
        id: consultant.id,
        fullName: consultant.user.fullName,
        email: consultant.user.email,
        location: consultant.location,
        availabilityStatus: consultant.availability,
        primarySkills: consultant.skills.map((cs) => cs.skill.name),
      };
      if (userRole !== "PROJECT_MANAGER") {
        dto.costToCompanyRate = consultant.costToCompany;
      }
      return dto;
    });
    return { page, total, consultants: mappedConsultants };
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
      location: consultant.location,
      availability: consultant.availability,
      costToCompany: consultant.costToCompany,
      skills: consultant.skills.map((cs) => ({
        skillName: cs.skill.name,
        competencyLevel: cs.competencyLevel,
        yearsExperience: cs.yearsExperience,
        confidenceLevel: cs.confidenceLevel,
      })),
      certificates: consultant.certificates.map((cert) => ({
        title: cert.title,
        issuingBody: cert.issuingBody,
        uploadedAt: cert.uploadedAt,
      })),
    };
  }
}
