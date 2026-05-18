import { ConflictException, Injectable } from "@nestjs/common";
import { ConsultantRepository } from "../repositories/consultant.repository";
import { CreateConsultantDto } from "../dto/create-consultant.dto";
import { ConsultantListItemDto, PaginatedConsultantsResponseDto } from '../dto/consultant-list.dto';

@Injectable()
export class ConsultantService {
    constructor(private readonly consultantRepository: ConsultantRepository) {}

    async createConsultant(dto: CreateConsultantDto) {
        //This function is for email duplication check
        const existingUser = await this.consultantRepository.findEmail(dto.email);
        if (existingUser) {
            throw new ConflictException('A consultant with this email already exists.');
        }

        const result = await this.consultantRepository.createConsultant(dto);

        return {
            message: 'Consultant created successfully',
            consultantId: result.consultantId,
        };
    }
    
    async getAllConsultants(page: number, limit: number, userRole: string): Promise<PaginatedConsultantsResponseDto> {
        const { consultants, total } = await this.consultantRepository.getAllConsultants(page, limit);

        const mappedConsultants: ConsultantListItemDto[] = consultants.map((consultant) => {
            const dto: ConsultantListItemDto = {
                id: consultant.id,
                fullName: consultant.user.fullName,
                location: consultant.location,
                availabilityStatus: consultant.availability,
                primarySkills: consultant.skills.map((cs) => cs.skill.name),
            };

            if (userRole !== 'PROJECT_MANAGER') {
                dto.costToCompanyRate = consultant.costToCompany;
            }

            return dto;
        });

        return {
            page,
            total,
            consultants: mappedConsultants,
        };
    }
}