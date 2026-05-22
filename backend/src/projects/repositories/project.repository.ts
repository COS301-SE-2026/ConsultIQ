import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { CompetencyLevel, ProjectStatus, Prisma } from '@prisma/client';

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
      Prisma.sql`WHERE pm."userId" = ${userId}`,
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
      Prisma.sql`WHERE cm."userId" = ${userId}`,
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
      Prisma.sql`WHERE c."userId" = ${userId}`,
    );
  }

  async getProjectById(projectId: string) {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });
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
          ${whereClause}
        `,
      ),
    ]);

    return { projects, total: Number(totalResult[0]?.count ?? 0) };
  }
}
