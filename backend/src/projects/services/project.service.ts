import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import {
  UpdateProjectDto,
  UpdateProjectSkillDto,
} from '../dto/update-project.dto';
import {
  PaginatedProjectsResponseDto,
  ProjectListItemDto,
} from '../dto/project-list.dto';
import { CompetencyLevel, ProjectStatus, Prisma } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class ProjectService {
  private readonly CACHE_KEY = 'cache:projects_list';
  private redisClient: Redis;
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
    this.redisClient = new Redis(redisUrl);
  }

  onModuleDestroy() {
    this.redisClient.quit();
  }
  async invalidateProjectsCache() {
    const stream = this.redisClient.scanStream({
      match: 'cache:projects:*',
      count: 100,
    });

    const keysToDelete: string[] = [];

    stream.on('data', (keys: string[]) => {
      if (keys.length > 0) {
        keysToDelete.push(...keys);
      }
    });

    stream.on('end', async () => {
      if (keysToDelete.length > 0) {
        const pipeline = this.redisClient.pipeline();
        keysToDelete.forEach((key) => pipeline.del(key));
        await pipeline.exec();
        console.log(`Cache Invalidated: Cleared ${keysToDelete.length} stale pages.`);
      }
    });
  }


  async createProject(dto: CreateProjectDto, userId: string, userRole: string) {
    if (userRole !== 'PROJECT_MANAGER' && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Only Project Managers can create projects.',
      );
    }

    if (dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (end <= start) {
        throw new BadRequestException('End date must be after start date.');
      }
    }

    const result = await this.persistProject(dto, userId);
    // Invalidate all paginated project list caches
    await this.invalidateProjectsCache();

    return {
      message: 'Project created successfully',
      projectId: result.projectId,
    };
  }

  async getAllProjects(
    page: number,
    limit: number,
    userRole: string,
    userId: string | null,
  ): Promise<PaginatedProjectsResponseDto> {
    let projects: any[];
    let total: number;

    const cacheKey = `cache:projects:role:${userRole}:user:${userId || 'all'}:page:${page}:limit:${limit}`;
    const cachedData = await this.cacheManager.get<PaginatedProjectsResponseDto>(cacheKey);

    if (cachedData) {
      console.log(`CACHE HIT for key: ${cacheKey}`);
      return cachedData;
    }

    console.log(`CACHE MISS for key: ${cacheKey}. Fetching from DB...`);

    switch (userRole) {
      case 'ADMIN':
        ({ projects, total } = await this.queryAllProjects(page, limit));
        break;

      case 'PROJECT_MANAGER':
        ({ projects, total } = await this.queryProjectsByProjectManager(
          userId!,
          page,
          limit,
        ));
        break;

      case 'CONSULTANT_MANAGER':
        ({ projects, total } = await this.queryProjectsByConsultantManager(
          userId!,
          page,
          limit,
        ));
        break;

      case 'CONSULTANT':
        ({ projects, total } = await this.queryProjectsByConsultant(
          userId!,
          page,
          limit,
        ));
        break;

      default:
        throw new ForbiddenException(
          'You do not have permission to view projects.',
        );
    }

    const mappedProjects: ProjectListItemDto[] = projects.map((p) => ({
      id: p.id,
      projectName: p.projectName,
      clientName: p.clientName,
      city: p.city,
      province: p.province,
      startDate: p.startDate,
      endDate: p.endDate ?? null,
      teamSize: p.teamSize,
      requiredAllocationPercentage: p.requiredAllocationPercentage,
      clientBillingBudget: Number(p.clientBillingBudget),
      status: p.status,
      skillCount: p.skillCount,
    }));
    const responseData = { page, limit, total, projects: mappedProjects };

    await this.cacheManager.set(cacheKey, responseData, 300000);

    return responseData;
  }

  async getProjectById(projectId: string) {
    const project = await this.findProjectById(projectId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
    return project;
  }

  async updateProject(
    projectId: string,
    dto: UpdateProjectDto,
    userId: string,
  ) {
    const project = await this.findProjectById(projectId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const isAssignedManager = await this.isProjectManagerForProject(
      userId,
      projectId,
    );
    if (!isAssignedManager) {
      throw new ForbiddenException(
        'Only the assigned Project Manager or an Admin can update this project.',
      );
    }

    if (dto.startDate || dto.endDate) {
      const start = new Date(dto.startDate ?? project.startDate);
      const end = dto.endDate ? new Date(dto.endDate) : project.endDate;
      if (end && end <= start) {
        throw new BadRequestException('End date must be after start date.');
      }
    }
    await this.invalidateProjectsCache();
    return this.persistProjectUpdate(projectId, dto);
  }

  //-------Get Project Status By Id----------
  async validateProjectIsComplete(projectId: string): Promise<void> {
    const status = await this.findProjectStatusById(projectId);

    if (!status) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (status === ProjectStatus.CLOSED || status === ProjectStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot run match: project status is ${status}`,
      );
    }
  }

  private async persistProject(dto: CreateProjectDto, creatorUserId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          projectName: dto.projectName,
          clientName: dto.clientName,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          suburb: dto.suburb,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          placeId: dto.placeId ?? null,
          formattedAddress: dto.formattedAddress ?? null,
          description: dto.description,
          postalCode: dto.postalCode ?? '',
          city: dto.city,
          province: dto.province,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          teamSize: dto.teamSize,
          allocation: dto.allocation,
          budget: dto.budget,
          status: ProjectStatus.OPEN,
        },
      });

      await tx.projectManager.create({
        data: {
          userId: creatorUserId,
          projectId: project.id,
        },
      });

      for (const skill of dto.skills) {
        const normalizedSkillName = skill.name.trim().toLowerCase();
        const skillRecord = await tx.skill.upsert({
          where: { name: normalizedSkillName },
          update: {},
          create: { name: normalizedSkillName, category: 'General' },
        });

        await tx.projectSkill.create({
          data: {
            projectId: project.id,
            skillId: skillRecord.id,
            competency: skill.competency as CompetencyLevel,
            mandatory: skill.mandatory,
            years: skill.years,
          },
        });
      }

      return { projectId: project.id };
    });
  }

  private async queryAllProjects(page: number, limit: number) {
    return this.getPaginatedProjects(page, limit);
  }

  private async queryProjectsByProjectManager(
    userId: string,
    page: number,
    limit: number,
  ) {
    return this.getPaginatedProjects(
      page,
      limit,
      Prisma.sql`INNER JOIN project_managers pm ON pm."projectId" = p.id`,
      Prisma.sql`AND pm."userId" = ${userId}`,
    );
  }

  private async queryProjectsByConsultantManager(
    userId: string,
    page: number,
    limit: number,
  ) {
    return this.getPaginatedProjects(
      page,
      limit,
      Prisma.sql`
        INNER JOIN project_placements pp ON pp."projectId" = p.id
        INNER JOIN consultant_managers cm ON cm."consultantId" = pp."consultantId"
      `,
      Prisma.sql`AND cm."userId" = ${userId}`,
    );
  }

  private async queryProjectsByConsultant(
    userId: string,
    page: number,
    limit: number,
  ) {
    return this.getPaginatedProjects(
      page,
      limit,
      Prisma.sql`
        INNER JOIN project_placements pp ON pp."projectId" = p.id
        INNER JOIN consultants c ON c.id = pp."consultantId"
      `,
      Prisma.sql`AND c."userId" = ${userId}`,
    );
  }

  private async findProjectById(projectId: string) {
    return this.prisma.project.findUnique({
      where: { id: projectId, status: { not: ProjectStatus.ARCHIVED } },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });
  }

  private async findProjectStatusById(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    return project?.status;
  }

  /**
   * Helper method to reduce duplicated raw SQL queries for project fetching.
   */
  private async getPaginatedProjects(
    page: number,
    limit: number,
    joins: Prisma.Sql = Prisma.empty,
    whereClause: Prisma.Sql = Prisma.empty,
  ) {
    const skip = (page - 1) * limit;

    const [projects, totalResult] = await Promise.all([
      this.prisma.$queryRaw<any[]>(
        Prisma.sql`
          SELECT
            p.id,
            p."projectName",
            p."clientName",
            p.city,
            p.province,
            p."startDate",
            p."endDate",
            p."teamSize",
            p.allocation AS "requiredAllocationPercentage",
            p.budget AS "clientBillingBudget",
            p.status,
            COUNT(ps.id)::int AS "skillCount"
          FROM projects p
          ${joins}
          LEFT JOIN project_skills ps ON ps."projectId" = p.id
          WHERE p.status != 'ARCHIVED'
          ${whereClause}
          GROUP BY p.id
          ORDER BY p."createdAt" DESC
          LIMIT ${limit} OFFSET ${skip}
        `,
      ),
      this.prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`
          SELECT COUNT(DISTINCT p.id)
          FROM projects p
          ${joins}
          WHERE p.status != 'ARCHIVED'
          ${whereClause}
        `,
      ),
    ]);

    return { projects, total: Number(totalResult[0]?.count ?? 0) };
  }

  private async isProjectManagerForProject(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    const record = await this.prisma.projectManager.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    return record !== null;
  }

  private async persistProjectUpdate(projectId: string, dto: UpdateProjectDto) {
    return this.prisma.$transaction(async (tx) => {
      const { skills, removeSkillIds, ...coreFields } = dto;

      const updateData = this.buildProjectUpdateData(coreFields);
      if (Object.keys(updateData).length > 0) {
        await tx.project.update({ where: { id: projectId }, data: updateData });
      }

      await this.removeProjectSkills(tx, projectId, removeSkillIds);
      await this.upsertProjectSkills(tx, projectId, skills);

      return tx.project.findUnique({
        where: { id: projectId },
        include: { skills: { include: { skill: true } } },
      });
    });
  }

  private buildProjectUpdateData(
    coreFields: Omit<UpdateProjectDto, 'skills' | 'removeSkillIds'>,
  ): Prisma.ProjectUpdateInput {
    const updateData = Object.entries(coreFields).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Prisma.ProjectUpdateInput & {
      latitude?: number | null;
      longitude?: number | null;
      placeId?: string | null;
      formattedAddress?: string | null;
    });

    if (updateData.startDate !== undefined) {
      updateData.startDate = new Date(updateData.startDate as string | Date);
    }

    if (updateData.endDate !== undefined) {
      updateData.endDate = new Date(updateData.endDate as string | Date);
    }

    return updateData;
  }

  private async removeProjectSkills(
    tx: Prisma.TransactionClient,
    projectId: string,
    removeSkillIds: string[] | undefined,
  ) {
    if (!removeSkillIds || removeSkillIds.length === 0) return;

    await tx.projectSkill.deleteMany({
      where: { id: { in: removeSkillIds }, projectId },
    });
  }

  private async upsertProjectSkills(
    tx: Prisma.TransactionClient,
    projectId: string,
    skills: UpdateProjectSkillDto[] | undefined,
  ) {
    if (!skills || skills.length === 0) return;

    for (const skillInput of skills) {
      const skillRecord = await this.upsertSkillCatalogEntry(
        tx,
        skillInput.name,
      );

      const existingProjectSkill = await tx.projectSkill.findFirst({
        where: {
          projectId: projectId,
          skillId: skillRecord.id,
        }
      });


      if (existingProjectSkill) {
        await tx.projectSkill.update({
          where: { id: existingProjectSkill.id },
          data: {
            //  skillId: skillRecord.id,
            competency: skillInput.competency as CompetencyLevel,
            years: skillInput.years,
            mandatory: skillInput.mandatory,
          },
        });
      } else {
        await tx.projectSkill.create({
          data: {
            projectId,
            skillId: skillRecord.id,
            competency: skillInput.competency as CompetencyLevel,
            years: skillInput.years,
            mandatory: skillInput.mandatory,
          },
        });
      }
    }
  }

  private async upsertSkillCatalogEntry(
    tx: Prisma.TransactionClient,
    name: string,
  ) {
    const normalizedSkillName = name.trim().toLowerCase();
    return tx.skill.upsert({
      where: { name: normalizedSkillName },
      update: {},
      create: { name: normalizedSkillName, category: 'General' },
    });
  }
}
