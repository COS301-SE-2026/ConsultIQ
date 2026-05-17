import { Injectable} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultantDto } from '../create-consultant/dto/create-consultant.dto';
import { CompetencyLevel, ConsultantAvailability, Role } from '@prisma/client';

@Injectable()
export class ConsultantRepository {
    constructor(private prisma: PrismaService) {}

    async findEmail(email: string) {
        return await this.prisma.user.findUnique({
            where: { email },
        });
    }

    async createConsultant(dto: CreateConsultantDto){
        return await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: dto.email,
                    fullName: dto.fullName,
                    role: Role.CONSULTANT,
            },
        });

        const consultant = await tx.consultant.create({
            data: {
                userId: user.id,
                location: dto.location,
                costToCompany: dto.costToCompanyRate,
                availability: ConsultantAvailability.AVAILABLE,
            },
        });

        for (const skill of dto.skills) {
            const normalizedSkillName = skill.skillName.trim().toLowerCase();
            
            const skillRecord = await tx.skill.upsert({
                where: { name: normalizedSkillName },
                update: {},
                create: { name: normalizedSkillName, category: 'General' },
            });

            await tx.consultantSkill.create({
                data: {
                    consultantId: consultant.id,   
                    skillId: skillRecord.id,
                    competencyLevel: CompetencyLevel.BEGINNER,
                    yearsExperience: skill.yearsOfExperience,
                    confidenceLevel: skill.confidenceLevel,
                },
            });
        }

        for(const cert of dto.certifications) {
            await tx.certificate.create({
                data: {
                    consultantId: consultant.id,
                    title: cert.certificationName,
                    issuingBody: cert.issuingBody,
                },
            });
        }
        return { consultantId: consultant.id }
    });
    }
}



    