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
import { UpdateConsultantDto } from '../dto/update-consultant.dto';
import {
  CompetencyLevel,
  ConsultantAvailability,
  JobType,
  WorkModel,
} from '@prisma/client';
import { NotificationService } from '../../notification/service/notification.service';
@Injectable()
export class ConsultantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

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
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2,
            suburb: dto.suburb,
            city: dto.province,
            province: dto.province,
            postalCode: dto.postalCode,
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
      .then(async (result) => {
        //send notification to consultant
        await this.notificationService.createAndSendNotification(
          dto.consultantUserId,
          'Profile creation! 🎉',
          'Your consultant profile has been completed.',
        );

        // Return the final response to the controller
        return {
          message: 'Consultant profile created successfully.',
          consultantId: result.consultantId,
        };
      });
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
        where: {
          user: {
            deletedAt: null,
            status: { not: 'ARCHIVED' },
          },
        },
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
        addressLine1: c.addressLine1,
        addressLine2: c.addressLine2,
        suburb: c.suburb,
        city: c.province,
        province: c.province,
        postalCode: c.postalCode,
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
      include: this.getProfileIncludes(),
    });

    if (!consultant) {
      throw new NotFoundException(`Consultant with id ${id} not found.`);
    }

    return this.mapToProfileDto(consultant);
  }

  async getConsultantByUserId(userId: string): Promise<ConsultantProfileDto> {
    const consultant = await this.prisma.consultant.findUnique({
      where: { userId },
      include: this.getProfileIncludes(),
    });

    if (!consultant) {
      throw new NotFoundException(
        `Consultant with userId ${userId} not found.`,
      );
    }

    return this.mapToProfileDto(consultant);
  }

  async updateConsultantProfile(consultantId: string, dto: UpdateConsultantDto,): Promise<{message: string}> {
    //Verify consultant exists
    const existing = await this.prisma.consultant.findUnique({
      where: {id: consultantId}
    });

    if(!existing){
      throw new NotFoundException(`Consultant with id ${consultantId} not found.`)
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.consultant.update({
        where: {id: consultantId},
        data: {
          ...(dto.phone !== undefined && {phone: dto.phone}),
          ...(dto.idNumber !== undefined && { idNumber: dto.idNumber }),
          ...(dto.nationality !== undefined && { nationality: dto.nationality }),
          ...(dto.location !== undefined && { location: dto.location }),
          ...(dto.costToCompany !== undefined && { costToCompany: dto.costToCompany }),
          ...(dto.availability !== undefined && {
            availability: dto.availability as ConsultantAvailability,
        }),
        },
      });

      if(dto.skills !== undefined){
        await tx.consultantSkill.deleteMany({
          where: { consultantId },
        });

        for (const skill of dto.skills) {
          const normalizedName = skill.skillName.trim().toLowerCase();
          const skillRecord = await tx.skill.upsert({
            where: { name: normalizedName },
            update: {},
            create: { name: normalizedName, category: 'General' },
          });

          // Recompute competency level server-side
          const competencyLevel = this.inferCompetencyLevel(
            skill.yearsExperience,
            skill.confidenceLevel,
          );

          await tx.consultantSkill.create({
            data: {
              consultantId,
              skillId: skillRecord.id,
              competencyLevel,
              yearsExperience: skill.yearsExperience,
              confidenceLevel: skill.confidenceLevel,
            },
          });
        } 
      }

      if (dto.experiences !== undefined) {
        await tx.consultantExperience.deleteMany({
          where: { consultantId },
        });

        for (const exp of dto.experiences) {
          await tx.consultantExperience.create({
            data: {
              consultantId,
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
      }

      if(dto.certifications !== undefined){
        await tx.certificate.deleteMany({
          where: {consultantId},
        });

        for(const cert of dto.certifications) {
          await tx.certificate.create({
            data: {
            consultantId,
            title: cert.title,
            issuingBody: cert.issuingBody,
            startDate: cert.startDate ? new Date(cert.startDate) : null,
          },
          });
        }
      }
    });

    return {message: 'Consultant profile updated successfully.'};
  }

  // --- PRIVATE HELPER METHODS FOR DRY CODE ---

  private getProfileIncludes() {
    return {
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
      certificates: {
        select: {
          id: true,
          title: true,
          issuingBody: true,
          startDate: true,
          endDate: true,
          uploadedAt: true,
        },
      },
      consultantExperiences: {
        select: {
          id: true,
          companyName: true,
          jobTitle: true,
          jobType: true,
          startDate: true,
          endDate: true,
          description: true,
          workModel: true,
        },
      },
    };
  }

  private mapToProfileDto(consultant: any): ConsultantProfileDto {
    return {
      id: consultant.id,
      fullName: consultant.user.fullName,
      email: consultant.user.email,
      phoneNumber: consultant.phone ?? '',
      idNumber: consultant.idNumber ?? '',
      nationality: consultant.nationality ?? '',
      addressLine1: consultant.addressLine1,
      addressLine2: consultant.addressLine2,
      suburb: consultant.suburb,
      city: consultant.city,
      province: consultant.province,
      postalCode: consultant.postalCode,
      costToCompany: consultant.costToCompany,
      availability: consultant.availability,
      skills: consultant.skills.map((cs: any) => ({
        id: cs.id,
        skillName: cs.skill.name,
        competencyLevel: cs.competencyLevel,
        yearsExperience: cs.yearsExperience,
        confidenceLevel: cs.confidenceLevel,
      })),
      experience: consultant.consultantExperiences.map((exp: any) => ({
        id: exp.id,
        companyname: exp.companyName,
        jobTitle: exp.jobTitle,
        jobType: exp.jobType,
        startDate: exp.startDate,
        endDate: exp.endDate,
        roleDescription: exp.description,
        workModel: exp.workModel,
      })),
      certificates: consultant.certificates.map((cert: any) => ({
        id: cert.id,
        title: cert.title,
        issuingBody: cert.issuingBody,
        startDate: cert.startDate,
        endDate: cert.endDate,
        uploadedAt: cert.uploadedAt,
      })),
    };
  }

  private inferCompetencyLevel(yearsExperience: number, confidenceLevel: number): CompetencyLevel{
    if(yearsExperience >= 5 && confidenceLevel >= 4){
      return CompetencyLevel.EXPERT
    }

    if(yearsExperience >= 2 && confidenceLevel >= 3){
      return CompetencyLevel.INTERMEDIATE
    }

    return CompetencyLevel.BEGINNER
  }

  //-----------------Consultant get assigned projects-------------------
  async getAssignedProjects(userId: string) {
    const consultant = await this.prisma.consultant.findUnique({
      where: { userId },
    });

    if (!consultant) {
      throw new NotFoundException(`No consultant profile for this user.`);
    }

    const placement = await this.prisma.projectPlacement.findMany({
      where: { consultantId: consultant.id },
      include: {
        //
        project: {
          //
          include: {
            placements: {
              //
              include: {
                //
                consultant: {
                  //
                  include: {
                    user: {
                      select: {
                        fullName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return placement.map((p) => ({
      placementId: p.id,
      placementStatus: p.status,
      placementAllocation: p.allocation,
      startDate: p.startDate,
      endDate: p.endDate,
      project: {
        projectName: p.project.projectName,
        clientName: p.project.clientName,
        description: p.project.description,
        suburb: p.project.suburb,
        city: p.project.city,
        province: p.project.province,
        status: p.project.status,
        startDate: p.project.startDate,
        endDate: p.project.endDate,
        allocation: p.project.allocation,
        teamMembers: p.project.placements
          .filter((pl) => pl.consultantId !== consultant.id)
          .map((pl) => ({
            fullName: pl.consultant.user.fullName,
            email: pl.consultant.user.email,
          })),
      },
    }));
  }
}
