import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateConsultantDto } from "../dto/create-consultant.dto";
import { Role, ConsultantAvailability, CompetencyLevel } from "@prisma/client";

@Injectable()
export class ConsultantRepository {
  constructor(private prisma: PrismaService) {}

  async findEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async createConsultant(dto: CreateConsultantDto) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          fullName: `${dto.name} ${dto.surname}`,
          role: Role.CONSULTANT,
        },
      });

      const consultant = await tx.consultant.create({
        data: {
          userId: user.id,
          location: dto.location,
          costToCompany: dto.costToCompany,
          availability: dto.availability
            ? ConsultantAvailability.AVAILABLE
            : ConsultantAvailability.UNAVAILABLE,
        },
      });

      for (const skill of dto.skills) {
        const normalizedSkillName = skill.skillName.trim().toLowerCase();
        const skillRecord = await tx.skill.upsert({
          where: { name: normalizedSkillName },
          update: {},
          create: { name: normalizedSkillName, category: "General" },
        });
        await tx.consultantSkill.create({
          data: {
            consultantId: consultant.id,
            skillId: skillRecord.id,
            competencyLevel: CompetencyLevel.BEGINNER,
            yearsExperience: parseInt(skill.experience, 10) || 0,
            confidenceLevel: 5,
          },
        });
      }

      for (const cert of dto.certifications) {
        await tx.certificate.create({
          data: {
            consultantId: consultant.id,
            title: cert.title,
            issuingBody: "Unknown",
          },
        });
      }

      return { consultantId: consultant.id };
    });
  }

  async getAllConsultants(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [consultants, total] = await Promise.all([
      this.prisma.consultant.findMany({
        skip,
        take: limit,
        include: {
          user: { select: { fullName: true, email: true } },
          skills: { include: { skill: { select: { name: true } } } },
          certificates: { select: { title: true, issuingBody: true, uploadedAt: true } },
        },
      }),
      this.prisma.consultant.count(),
    ]);
    return { consultants, total };
  }

  async getConsultantById(id: string) {
    return await this.prisma.consultant.findUnique({
      where: { id },
      include: {
        user: { select: { fullName: true, email: true } },
        skills: {
        select: {
            id: true,                              
            competencyLevel: true,
            yearsExperience: true,
            confidenceLevel: true,
            skill: { select: { name: true } },
          },
        },
       certificates: { select: { id: true, title: true, issuingBody: true, startDate: true, endDate: true, uploadedAt: true } },
        consultantExperiences: { select: { id: true, companyName: true, jobTitle: true, jobType: true, startDate: true, endDate: true, description: true, workModel: true } },
      },
    });
  }

 async getConsultantByUserId(userId: string) {
  return await this.prisma.consultant.findUnique({
    where: { userId },          
    include: {
      user: { select: { fullName: true, email: true } },
      skills: {
      select: {
          id: true,                              
          competencyLevel: true,
          yearsExperience: true,
          confidenceLevel: true,
          skill: { select: { name: true } },
        },
      },
      certificates: { select: { id: true, title: true, issuingBody: true, startDate: true, endDate: true, uploadedAt: true } },
     consultantExperiences: { select: { id: true, companyName: true, jobTitle: true, jobType: true, startDate: true, endDate: true, description: true, workModel: true } },
    },
  });
}

}
