import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { CompetencyLevel, ProjectStatus, Prisma } from '@prisma/client';
import {
  UpdateProjectDto,
  UpdateProjectSkillDto,
} from '../dto/update-project.dto';

@Injectable()
export class ProjectRepository {
  constructor(private prisma: PrismaService) {}

  async createProject(dto: CreateProjectDto, creatorUserId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          projectName: dto.projectName,
          clientName: dto.clientName,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          suburb: dto.suburb,
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

  async getAllProjects(page: number, limit: number) {
    return this.getPaginatedProjects(page, limit);
  }

  async getProjectsByProjectManager(
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

  async getProjectsByConsultantManager(
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

  async getProjectsByConsultant(userId: string, page: number, limit: number) {
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

  async getProjectById(projectId: string) {
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

  /** Get Project Status By Id*/
  async getProjectStatusById(projectId: string) {
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

  async isProjectManagerForProject(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    const record = await this.prisma.projectManager.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    return record !== null;
  }

  async updateProject(projectId: string, dto: UpdateProjectDto) {
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
    const updateData: Prisma.ProjectUpdateInput = {};
    if (coreFields.projectName !== undefined) {
      updateData.projectName = coreFields.projectName;
    }

    if (coreFields.clientName !== undefined) {
      updateData.clientName = coreFields.clientName;
    }

    if (coreFields.description !== undefined) {
      updateData.description = coreFields.description;
    }

    if (coreFields.addressLine1 !== undefined) {
      updateData.addressLine1 = coreFields.addressLine1;
    }

    if (coreFields.addressLine2 !== undefined) {
      updateData.addressLine2 = coreFields.addressLine2;
    }

    if (coreFields.suburb !== undefined) {
      updateData.suburb = coreFields.suburb;
    }

    if (coreFields.city !== undefined) {
      updateData.city = coreFields.city;
    }

    if (coreFields.province !== undefined) {
      updateData.province = coreFields.province;
    }
    if (coreFields.postalCode !== undefined) {
      updateData.postalCode = coreFields.postalCode;
    }

    if (coreFields.startDate !== undefined) {
      updateData.startDate = new Date(coreFields.startDate);
    }

    if (coreFields.endDate !== undefined) {
      updateData.endDate = new Date(coreFields.endDate);
    }

    if (coreFields.teamSize !== undefined) {
      updateData.teamSize = coreFields.teamSize;
    }

    if (coreFields.allocation !== undefined) {
      updateData.allocation = coreFields.allocation;
    }

    if (coreFields.budget !== undefined) {
      updateData.budget = coreFields.budget;
    }

    if (coreFields.status !== undefined) {
      updateData.status = coreFields.status;
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

      if (skillInput.id) {
        await tx.projectSkill.update({
          where: { id: skillInput.id },
          data: {
            skillId: skillRecord.id,
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
