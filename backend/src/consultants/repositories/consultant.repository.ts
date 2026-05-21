import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsultantDto } from '../dto/create-consultant.dto';
import { Role, ConsultantAvailability, CompetencyLevel, JobType, WorkModel } from '@prisma/client';

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
            const roleRecord = await tx.roleDefinition.findUnique({ where: { name: Role.CONSULTANT } });

            const user = await tx.user.create({
                data: {
                    email: dto.email,
                    fullName: `${dto.name} ${dto.surname}`,
                    role: Role.CONSULTANT,
                    roleId: roleRecord ? roleRecord.id : null,
            },
        });

        const consultant = await tx.consultant.create({
            data: {
                userId: user.id,
                location: dto.location,
                availability: dto.availability ? ConsultantAvailability.AVAILABLE : ConsultantAvailability.UNAVAILABLE,
                phone: dto.phoneNumber,
                idNumber: dto.idNumber,
                costToCompany: dto.costToCompany,
            },
        });

        for (const skill of dto.skills) {
            const normalizedSkillName = skill.skillName.trim().toLowerCase();
            
            let skillRecord = await tx.skill.findUnique({
                where: { name: normalizedSkillName }
            });
            if (!skillRecord) {
                skillRecord = await tx.skill.create({
                    data: { 
                        name: normalizedSkillName,
                        category: 'General'
                    }
                });
            }

            let compLevel: CompetencyLevel = CompetencyLevel.BEGINNER;
            const upperLevel = skill.competencyLevel.toUpperCase();
            if (Object.values(CompetencyLevel).includes(upperLevel as CompetencyLevel)) {
                compLevel = upperLevel as CompetencyLevel;
            }

            await tx.consultantSkill.create({
                data: {
                    consultantId: consultant.id,   
                    skillId: skillRecord.id,
                    competencyLevel: compLevel,
                    yearsExperience: parseInt(skill.experience, 10) || 0,
                    confidenceLevel: 5,
                },
            });
        }

        for(const cert of dto.certifications) {
            await tx.certificate.create({
                data: {
                    consultantId: consultant.id,
                    title: cert.title,
                    issuingBody: 'Unknown',
                },
            });
        }
        return { consultantId: consultant.id }
    });
    }

    async getAllConsultants(page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [consultants, total] = await Promise.all([
            this.prisma.consultant.findMany({
            skip,
            take: limit,
            include: {
                user: {
                select: {
                    fullName: true,
                    email: true,
                },
                },
                skills: {
                include: {
                    skill: {
                    select: {
                        name: true,
                    },
                    },
                },
                },
                certificates: {
                select: {
                    title: true,
                },
                },
            },
            }),
            this.prisma.consultant.count(),
        ]);

        return { consultants, total };
    }

}



    