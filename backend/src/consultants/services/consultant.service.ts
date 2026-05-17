import { ConflictException, Injectable } from "@nestjs/common";
import { ConsultantRepository } from "src/repositories/consultant.repository";
import { CreateConsultantDto } from "../dto/create-consultant.dto";

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
}