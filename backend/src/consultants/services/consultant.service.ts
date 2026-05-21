import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConsultantListItemDto,
  CreateConsultantDto,
  PaginatedConsultantsResponseDto,
  PendingProfileUserDto,
} from '../dto/create-consultant.dto';
import { ConsultantProfileDto } from '../dto/consultant-profile.dto';
import {
  CompetencyLevel,
  ConsultantAvailability,
  JobType,
  WorkModel,
} from '@prisma/client';

@Injectable()
export class ConsultantService {
  constructor(private readonly prisma: PrismaService) {}

  async createConsultantProfile(
    cmUserId: string,
    dto: CreateConsultantDto,
  ): Promise<{ message: string; consultantId: string }> {
    // Verify the target user exists and is a CONSULTANT
    const user = await this.prisma.user.findUnique({
      where: { id: dto.consultantUserId },
    });

    if (!user) {
      throw new NotFoundException('Consultant user not found.');
    }

    if (user.role !== 'CONSULTANT') {
      throw new ForbiddenException('Target user is not a CONSULTANT.');
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Consultant account must be active before creating a profile.',
      );
    }

    // Check if profile already exists
    const existing = await this.prisma.consultant.findUnique({
      where: { userId: dto.consultantUserId },
    });

    if (existing) {
      throw new ConflictException(
        'A profile already exists for this consultant.',
      );
    }

    return await this.prisma
      .$transaction(async (tx) => {
        // Create consultant profile
        const consultant = await tx.consultant.create({
          data: {
            userId: dto.consultantUserId,
            location: dto.location,
            phone: dto.phone,
            idNumber: dto.idNumber,
            nationality: dto.nationality,
            costToCompany: dto.costToCompany,
            availability: dto.availability as ConsultantAvailability,
          },
        });

        // Link the CM to this consultant
        await tx.consultantManager.create({
          data: {
            userId: cmUserId,
            consultantId: consultant.id,
          },
        });

        // Create skills
        for (const skill of dto.skills) {
          const normalizedName = skill.skillName.trim().toLowerCase();
          const skillRecord = await tx.skill.upsert({
            where: { name: normalizedName },
            update: {},
            create: { name: normalizedName, category: 'General' },
          });
          await tx.consultantSkill.create({
            data: {
              consultantId: consultant.id,
              skillId: skillRecord.id,
              competencyLevel: skill.competencyLevel as CompetencyLevel,
              yearsExperience: skill.yearsExperience,
              confidenceLevel: skill.confidenceLevel,
            },
          });
        }

        // Create experiences
        for (const exp of dto.experiences) {
          await tx.consultantExperience.create({
            data: {
              consultantId: consultant.id,
              jobTitle: exp.jobTitle,
              companyName: exp.companyName,
              jobType: exp.jobType as JobType,
              workModel: exp.workModel as WorkModel,
              startDate: new Date(exp.startDate),
              endDate: exp.endDate ? new Date(exp.endDate) : null,
              description: exp.description,
            },
          });
        }

        // Create certifications
        if (dto.certifications) {
          for (const cert of dto.certifications) {
            await tx.certificate.create({
              data: {
                consultantId: consultant.id,
                title: cert.title,
                issuingBody: cert.issuingBody,
                startDate: cert.startDate ? new Date(cert.startDate) : null,
                endDate: cert.endDate ? new Date(cert.endDate) : null,
              },
            });
          }
        }

        return { consultantId: consultant.id };
      })
      .then((result) => ({
        message: 'Consultant profile created successfully.',
        consultantId: result.consultantId,
      }));
  }

  async getPendingProfiles(): Promise<PendingProfileUserDto[]> {
    // Find all CONSULTANT users who are ACTIVE but have no Consultant record
    const users = await this.prisma.user.findMany({
      where: {
        role: 'CONSULTANT',
        status: 'ACTIVE',
        consultant: null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      userId: u.id,
      fullName: u.fullName,
      email: u.email,
      createdAt: u.createdAt,
    }));
  }

  async getAllConsultants(
    page: number,
    limit: number,
    userRole: string,
  ): Promise<PaginatedConsultantsResponseDto> {
    const skip = (page - 1) * limit;
    const [consultants, total] = await Promise.all([
      this.prisma.consultant.findMany({
        skip,
        take: limit,
        include: {
          user: { select: { fullName: true, email: true } },
          skills: { include: { skill: { select: { name: true } } } },
          certificates: { select: { title: true } },
          consultantExperiences: { select: { startDate: true, endDate: true } },
        },
      }),
      this.prisma.consultant.count(),
    ]);

    const mappedConsultants: ConsultantListItemDto[] = consultants.map((c) => {
      // Calculate total years of experience
      const experienceYears = c.consultantExperiences.reduce((total, exp) => {
        const end = exp.endDate ?? new Date();
        const years =
          (end.getTime() - exp.startDate.getTime()) /
          (1000 * 60 * 60 * 24 * 365);
        return total + years;
      }, 0);

      const dto: ConsultantListItemDto = {
        id: c.id,
        fullName: c.user.fullName,
        email: c.user.email,
        location: c.location,
        availabilityStatus: c.availability,
        primarySkills: c.skills.map((cs) => cs.skill.name),
        phone: c.phone,
        idNumber: c.idNumber,
        experienceYears: Math.floor(experienceYears),
        certifications: c.certificates.map((cert) => cert.title),
      };

      if (userRole !== 'PROJECT_MANAGER') {
        dto.costToCompanyRate = c.costToCompany;
      }

      return dto;
    });

    return { page, total, consultants: mappedConsultants };
  }

  async getConsultantById(id: string): Promise<ConsultantProfileDto> {
    const consultant = await this.prisma.consultant.findUnique({
      where: { id },
      include: {
        user: { select: { fullName: true, email: true } },
        skills: { include: { skill: { select: { name: true } } } },
        certificates: true,
        consultantExperiences: true,
      },
    });

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
        skillName: cs.skill.name,
        competencyLevel: cs.competencyLevel,
        yearsExperience: cs.yearsExperience,
        confidenceLevel: cs.confidenceLevel,
      })),
      experience: consultant.consultantExperiences.map((exp) => ({
        companyname: exp.companyName,
        jobTitle: exp.jobTitle,
        jobType: exp.jobType,
        startDate: exp.startDate,
        endDate: exp.endDate ?? new Date(),
        roleDescription: exp.description,
        workModel: exp.workModel,
      })),
      certificates: consultant.certificates.map((cert) => ({
        title: cert.title,
        issuingBody: cert.issuingBody,
        startDate: cert.startDate ?? new Date(),
        endDate: cert.endDate ?? new Date(),
        uploadedAt: cert.uploadedAt,
      })),
    };
  }
}
