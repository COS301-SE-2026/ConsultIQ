import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
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
  Role,
  WorkModel,
} from '@prisma/client';
import { NotificationService } from '../../notification/service/notification.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RedisUtilityService } from '../../common/services/redis-utility.service';
import {
  ProjectConsultantDto,
  ProjectConsultantsResponseDto,
} from '../dto/consultant-placement.dto';
import { EncryptionPrismaClient } from '../../common/encryption/services/client-extension.service';

@Injectable()
export class ConsultantService {
  private readonly CACHE_KEY = 'cache:consultants_list';
  private readonly logger = new Logger(ConsultantService.name);

  constructor(
    //private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly redisUtilityService: RedisUtilityService,
    private readonly encryptionPrisma: EncryptionPrismaClient,
  ) { }
  async invalidateConsultantCache() {
    await this.redisUtilityService.invalidateCacheByPattern(
      'cache:consultants:*',
    );
  }

  async createConsultantProfile(
    cmUserId: string,
    dto: CreateConsultantDto,
  ): Promise<{ message: string; consultantId: string }> {
    // Verify the target user exists and is a CONSULTANT
    const user = await this.encryptionPrisma.user.findUnique({
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
    const existing = await this.encryptionPrisma.consultant.findUnique({
      where: { userId: dto.consultantUserId },
    });

    if (existing) {
      throw new ConflictException(
        'A profile already exists for this consultant.',
      );
    }
    return await this.encryptionPrisma
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

            latitude: dto.latitude ?? null,
            longitude: dto.longitude ?? null,
            placeId: dto.placeId ?? null,
            formattedAddress: dto.formattedAddress ?? null,
          },
        });

        // Link any CV uploaded for this user
        await tx.cvFile.updateMany({
          where: { userId: dto.consultantUserId, consultantId: null},
          data: { consultantId: consultant.id}
        })

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
        // Invalidate all paginated consultant list caches
        await this.invalidateConsultantCache();

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
    const users = await this.encryptionPrisma.user.findMany({
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
    const cacheKey = `cache:consultants:page:${page}:limit:${limit}:role:${userRole}`;
    const cachedData =
      await this.cacheManager.get<PaginatedConsultantsResponseDto>(cacheKey);
    if (cachedData) {
      this.logger.log(`CACHE HIT for key: ${cacheKey}`);
      return cachedData;
    }
    this.logger.log(`CACHE MISS for key: ${cacheKey}. Fetching from DB...`);

    const skip = (page - 1) * limit;
    const [consultants, total] = await Promise.all([
      this.encryptionPrisma.consultant.findMany({
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
      this.encryptionPrisma.consultant.count(),
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
        city: c.city,
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
    const response = { page, limit, total, consultants: mappedConsultants };
    // TTL: 5 min
    await this.cacheManager.set(cacheKey, response, 300000);

    return response;
  }

  async getConsultantById(id: string): Promise<ConsultantProfileDto> {
    const consultant = await this.encryptionPrisma.consultant.findUnique({
      where: { id },
      include: this.getProfileIncludes(),
    });

    if (!consultant) {
      throw new NotFoundException(`Consultant with id ${id} not found.`);
    }

    return this.mapToProfileDto(consultant);
  }

  async getConsultantByUserId(userId: string): Promise<ConsultantProfileDto> {
    const consultant = await this.encryptionPrisma.consultant.findUnique({
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
  async getConsultantsByProject(
    projectId: string,
    userRole: string,
  ): Promise<ProjectConsultantsResponseDto> {
    const now = new Date();

    const placements = await this.encryptionPrisma.projectPlacement.findMany({
      where: {
        projectId: projectId,
        status: 'ACTIVE',

        startDate: {
          lte: now,
        },

        OR: [{ endDate: null }, { endDate: { gte: now } }],

        consultant: {
          user: {
            status: 'ACTIVE',
          },
        },
      },
      include: {
        consultant: {
          include: {
            user: { select: { fullName: true, email: true } },
            skills: { include: { skill: { select: { name: true } } } },
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    const mappedConsultants: ProjectConsultantDto[] = placements.map(
      (placement) => {
        const c = placement.consultant;

        const dto: ProjectConsultantDto = {
          consultantId: c.id,
          placementId: placement.id,
          fullName: c.user.fullName,
          email: c.user.email,
          phone: c.phone,
          city: c.city,
          primarySkills: c.skills.map((cs) => cs.skill.name),

          placementStatus: placement.status,
          allocation: placement.allocation,
          startDate: placement.startDate,
          endDate: placement.endDate,
        };

        if (userRole !== 'PROJECT_MANAGER') {
          dto.costToCompany = c.costToCompany;
        }

        return dto;
      },
    );

    const response: ProjectConsultantsResponseDto = {
      projectId,
      totalPlacements: mappedConsultants.length,
      consultants: mappedConsultants,
    };

    return response;
  }

  private async resolveEditableConsultantId(
    consultantId: string,
    userRole: string,
    requestingUserId: string,
  ): Promise<string> {
    if (userRole == Role.CONSULTANT) {
      const consultantProfile = await this.encryptionPrisma.consultant.findUnique({
        where: { userId: requestingUserId },
        select: { id: true },
      });
      if (!consultantProfile) {
        throw new NotFoundException(
          `No consultant profile for the current user.`,
        );
      }

      return consultantProfile.id;
    }

    return consultantId;
  }
  async updateConsultantProfile(
    consultantId: string,
    dto: UpdateConsultantDto,
    userRole: string,
    requestingUserId: string,
  ): Promise<{ message: string }> {
    const resolvedConsultantId = await this.resolveEditableConsultantId(
      consultantId,
      userRole,
      requestingUserId,
    );
    //Verify consultant exists
    const existing = await this.encryptionPrisma.consultant.findUnique({
      where: { id: resolvedConsultantId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Consultant with id ${consultantId} not found.`,
      );
    }

    await this.encryptionPrisma.$transaction(async (tx) => {

      const consultant = await tx.consultant.findUnique({
        where: { id: resolvedConsultantId },
      });

      if (!consultant) {
        throw new NotFoundException(
          `Consultant with id ${resolvedConsultantId} not found.`,
        );
      }

      if (dto.fullname !== undefined) {
        await tx.user.update({
          where: { id: consultant.userId },
          data: {
            fullName: dto.fullname,
            email: dto.email,
          },
        });
      }

      await tx.consultant.update({
        where: { id: resolvedConsultantId },
        data: {
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.idNumber !== undefined && { idNumber: dto.idNumber }),
          ...(dto.nationality !== undefined && {
            nationality: dto.nationality,
          }),
          ...(dto.addressLine1 !== undefined && {
            addressLine1: dto.addressLine1,
          }),
          ...(dto.addressLine2 !== undefined && {
            addressLine2: dto.addressLine2,
          }),
          ...(dto.suburb !== undefined && { suburb: dto.suburb }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.province !== undefined && { province: dto.province }),
          ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
          ...(dto.costToCompany !== undefined && {
            costToCompany: dto.costToCompany,
          }),
          ...(dto.availability !== undefined && {
            availability: dto.availability as ConsultantAvailability,
          }),
          ...((dto.latitude !== undefined ||
            dto.longitude !== undefined ||
            dto.placeId !== undefined ||
            dto.formattedAddress !== undefined) && {
            latitude: dto.latitude ?? null,
            longitude: dto.longitude ?? null,
            placeId: dto.placeId ?? null,
            formattedAddress: dto.formattedAddress ?? null,
          }),
        },
      });

      if (dto.skills !== undefined) {
        await tx.consultantSkill.deleteMany({
          where: { consultantId: resolvedConsultantId },
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
              consultantId: resolvedConsultantId,
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
          where: { consultantId: resolvedConsultantId },
        });

        for (const exp of dto.experiences) {
          await tx.consultantExperience.create({
            data: {
              consultantId: resolvedConsultantId,
              jobTitle: exp.jobTitle,
              companyName: exp.companyName,
              jobType: exp.jobType
                .toUpperCase()
                .replace(/[\s-]/g, '_') as JobType,
              workModel: exp.workModel
                .toUpperCase()
                .replaceAll('-', '') as WorkModel,
              startDate: new Date(exp.startDate),
              endDate: exp.endDate ? new Date(exp.endDate) : null,
              description: exp.description,
            },
          });
        }
      }

      if (dto.certifications !== undefined) {
        await tx.certificate.deleteMany({
          where: { consultantId: resolvedConsultantId },
        });

        for (const cert of dto.certifications) {
          await tx.certificate.create({
            data: {
              consultantId: resolvedConsultantId,
              title: cert.title,
              issuingBody: cert.issuingBody,
              startDate: cert.startDate ? new Date(cert.startDate) : null,
            },
          });
        }
      }

      if (dto.education !== undefined) {
        await tx.consultantEducation.deleteMany({
          where: { consultantId: resolvedConsultantId },
        });

        for (const edu of dto.education) {
          await tx.consultantEducation.create({
            data: {
              consultantId: resolvedConsultantId,
              institution: edu.institution,
              qualification: edu.qualification,
              startDate: new Date(edu.startDate),
              endDate: edu.endDate ? new Date(edu.endDate) : null,
              fileName: edu.fileName ?? null,
            },
          });
        }
      }
    });

    await this.invalidateConsultantCache();

    return { message: 'Consultant profile updated successfully.' };
  }

  async unassignConsultant(
    projectId: string,
    consultantId: string,
  ): Promise<{ message: string; placementId: string }> {

    const placement = await this.encryptionPrisma.projectPlacement.findFirst({
      where: {
        projectId,
        consultantId,
        status: 'ACTIVE',
      },
    });

    if (!placement) {
      throw new NotFoundException(
        'Active placement not found for this consultant on the specified project.',
      );
    }

    await this.encryptionPrisma.$transaction(async (tx) => {

      await tx.projectPlacement.update({
        where: { id: placement.id },
        data: {
          status: 'TERMINATED',
          endDate: new Date(),
        },
      });

      const updatedConsultant = await tx.consultant.update({
        where: { id: consultantId },
        data: {
          capacity: {
            increment: placement.allocation,
          },
        },
      });

      if (updatedConsultant.capacity > 100) {
        await tx.consultant.update({
          where: { id: consultantId },
          data: { capacity: 100 },
        });
      }

      const newAvailabilityStatus =
        updatedConsultant.capacity > 0 ? 'AVAILABLE' : 'UNAVAILABLE';

      if (updatedConsultant.availability !== newAvailabilityStatus) {
        await tx.consultant.update({
          where: { id: consultantId },
          data: { availability: newAvailabilityStatus as any },
        });
      }
    });

    return {
      message: 'Consultant successfully unassigned and capacity restored.',
      placementId: placement.id,
    };
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
      education: {
        select: {
          id: true,
          institution: true,
          qualification: true,
          startDate: true,
          endDate: true,
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
      latitude: consultant.latitude ?? null,
      longitude: consultant.longitude ?? null,
      placeId: consultant.placeId ?? null,
      formattedAddress: consultant.formattedAddress ?? null,
      province: consultant.province,
      postalCode: consultant.postalCode,
      costToCompany: consultant.costToCompany,
      availability: consultant.availability,
      pictureUrl: consultant.pictureData
        ? `data:${consultant.pictureMimeType};base64,${Buffer.from(consultant.pictureData).toString('base64')}`
        : null,
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
      education: consultant.education.map((edu: any) => ({
        id: edu.id,
        institution: edu.institution,
        qualification: edu.qualification,
        startDate: edu.startDate,
        endDate: edu.endDate,
      })),
    };
  }

  private inferCompetencyLevel(
    yearsExperience: number,
    confidenceLevel: number,
  ): CompetencyLevel {
    if (yearsExperience >= 5 && confidenceLevel >= 4) {
      return CompetencyLevel.EXPERT;
    }

    if (yearsExperience >= 2 && confidenceLevel >= 3) {
      return CompetencyLevel.INTERMEDIATE;
    }

    return CompetencyLevel.BEGINNER;
  }

  //-----------------Consultant get assigned projects-------------------
  async getAssignedProjects(userId: string) {
    const consultant = await this.encryptionPrisma.consultant.findUnique({
      where: { userId },
    });

    if (!consultant) {
      throw new NotFoundException(`No consultant profile for this user.`);
    }

    const placement = await this.encryptionPrisma.projectPlacement.findMany({
      where: { consultantId: consultant.id },
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
            clientName: true,
            description: true,
            addressLine1: true,
            suburb: true,
            city: true,
            province: true,
            postalCode: true,
            status: true,
            startDate: true,
            endDate: true,
            allocation: true,
            teamSize: true,
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
      project: p.project,
    }));
  }

  //-----------------Consultant get assigned projects DETAIL-------------------
  async getAssignedProjectDetails(userId: string, projectId: string) {
    const consultant = await this.encryptionPrisma.consultant.findUnique({
      where: { userId },
    });

    if (!consultant) {
      throw new NotFoundException(`No consultant profile for this user`);
    }

    const placement = await this.encryptionPrisma.projectPlacement.findFirst({
      where: { consultantId: consultant.id, projectId },
      include: {
        project: {
          include: {
            skills: {
              include: {
                skill: true,
              },
            },
            placements: {
              include: {
                consultant: {
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

    if (!placement) {
      throw new NotFoundException(
        `You are not assigned to project with ID ${projectId}.`,
      );
    }

    return {
      placementId: placement.id,
      placementStatus: placement.status,
      placementAllocation: placement.allocation,
      startDate: placement.startDate,
      endDate: placement.endDate,
      project: {
        id: placement.project.id,
        projectName: placement.project.projectName,
        clientName: placement.project.clientName,
        description: placement.project.description,
        addressLine1: placement.project.addressLine1,
        addressLine2: placement.project.addressLine2,
        suburb: placement.project.suburb,
        city: placement.project.city,
        province: placement.project.province,
        postalCode: placement.project.postalCode,
        status: placement.project.status,
        startDate: placement.project.startDate,
        endDate: placement.project.endDate,
        teamSize: placement.project.teamSize,
        allocation: placement.project.allocation,
        budget: placement.project.budget,
        skills: placement.project.skills.map((ps) => ({
          skillName: ps.skill.name,
          competency: ps.competency,
          years: ps.years,
          mandatory: ps.mandatory,
        })),
        teamMembers: placement.project.placements
          .filter((pl) => pl.consultantId !== consultant.id)
          .map((pl) => ({
            fullName: pl.consultant.user.fullName,
            email: pl.consultant.user.email,
          })),
      },
    };
  }

  //-----------------Consultant Profile Picture-------------------
  private readonly ALLOW_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  private readonly MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  async uploadProfilePicture(
    consultantId: string,
    userId: string,
    userRole: string,
    file: Express.Multer.File,
  ): Promise<{ pictureUrl: string; message: string }> {
    if (!this.ALLOW_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WEBP are allowed.');
    }

    if (file.size > this.MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Image size must not exceed 5MB.');
    }

    const consultant = await this.encryptionPrisma.consultant.findUnique({
      where: { id: consultantId },
    });

    if (!consultant) {
      throw new NotFoundException(
        `Consultant with id ${consultantId} not found.`,
      );
    }

    const isSelf = consultant.userId === userId;
    let isManagingCM = false;

    if (!isSelf && userRole === 'CONSULTANT_MANAGER') {
      const managerLink = await this.encryptionPrisma.consultantManager.findUnique({
        where: { userId_consultantId: { userId, consultantId } },
      });
      isManagingCM = !!managerLink;
    }

    if (!isSelf && !isManagingCM) {
      throw new ForbiddenException(
        'You can only update your own profile picture, or a profile picture for a consultant you manage.',
      );
    }

    await this.encryptionPrisma.consultant.update({
      where: { id: consultantId },
      data: {
        pictureData: Uint8Array.from(file.buffer),
        pictureMimeType: file.mimetype,
      },
    });

    const pictureUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    return { pictureUrl, message: 'Profile picture uploaded successfully.' };
  }
}
