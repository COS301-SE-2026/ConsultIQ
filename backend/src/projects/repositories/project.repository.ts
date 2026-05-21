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
            city: dto.city,
            province: dto.province,
            startDate: new Date(dto.startDate),
            endDate: dto.endDate ? new Date(dto.endDate) : null,
            teamSize: dto.teamSize,
            requiredAllocationPercentage: dto.allocation,
            clientBillingBudget: dto.budget,
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
            minimumCompetency: skill.competency as CompetencyLevel,
            isMandatory: skill.mandatory,
            },
        });
        }

        return { projectId: project.id };
    });
    }

  async getAllProjects(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
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
            p."requiredAllocationPercentage",
            p."clientBillingBudget",
            p.status,
            COUNT(ps.id)::int AS "skillCount"
          FROM projects p
          LEFT JOIN project_skills ps ON ps."projectId" = p.id
          GROUP BY p.id
          ORDER BY p."createdAt" DESC
          LIMIT ${limit} OFFSET ${skip}
        `
      ),
      this.prisma.project.count(),
    ]);

    return { projects, total };
  }

  async getProjectsByProjectManager(userId: string, page: number, limit: number) {
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
            p."requiredAllocationPercentage",
            p."clientBillingBudget",
            p.status,
            COUNT(ps.id)::int AS "skillCount"
          FROM projects p
          INNER JOIN project_managers pm ON pm."projectId" = p.id
          LEFT JOIN project_skills ps ON ps."projectId" = p.id
          WHERE pm."userId" = ${userId}
          GROUP BY p.id
          ORDER BY p."createdAt" DESC
          LIMIT ${limit} OFFSET ${skip}
        `
      ),
      this.prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`
          SELECT COUNT(DISTINCT p.id)
          FROM projects p
          INNER JOIN project_managers pm ON pm."projectId" = p.id
          WHERE pm."userId" = ${userId}
        `
      ),
    ]);

    return { projects, total: Number(totalResult[0]?.count ?? 0) };
  }

  async getProjectsByConsultantManager(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [projects, totalResult] = await Promise.all([
      this.prisma.$queryRaw<any[]>(
        Prisma.sql`
          SELECT DISTINCT
            p.id,
            p."projectName",
            p."clientName",
            p.city,
            p.province,
            p."startDate",
            p."endDate",
            p."teamSize",
            p."requiredAllocationPercentage",
            p."clientBillingBudget",
            p.status,
            COUNT(ps.id)::int AS "skillCount"
          FROM projects p
          INNER JOIN project_placements pp ON pp."projectId" = p.id
          INNER JOIN consultant_managers cm ON cm."consultantId" = pp."consultantId"
          LEFT JOIN project_skills ps ON ps."projectId" = p.id
          WHERE cm."userId" = ${userId}
          GROUP BY p.id
          ORDER BY p."createdAt" DESC
          LIMIT ${limit} OFFSET ${skip}
        `
      ),
      this.prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`
          SELECT COUNT(DISTINCT p.id)
          FROM projects p
          INNER JOIN project_placements pp ON pp."projectId" = p.id
          INNER JOIN consultant_managers cm ON cm."consultantId" = pp."consultantId"
          WHERE cm."userId" = ${userId}
        `
      ),
    ]);

    return { projects, total: Number(totalResult[0]?.count ?? 0) };
  }

  async getProjectsByConsultant(userId: string, page: number, limit: number) {
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
            p."requiredAllocationPercentage",
            p."clientBillingBudget",
            p.status,
            COUNT(ps.id)::int AS "skillCount"
          FROM projects p
          INNER JOIN project_placements pp ON pp."projectId" = p.id
          INNER JOIN consultants c ON c.id = pp."consultantId"
          LEFT JOIN project_skills ps ON ps."projectId" = p.id
          WHERE c."userId" = ${userId}
          GROUP BY p.id
          ORDER BY p."createdAt" DESC
          LIMIT ${limit} OFFSET ${skip}
        `
      ),
      this.prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`
          SELECT COUNT(DISTINCT p.id)
          FROM projects p
          INNER JOIN project_placements pp ON pp."projectId" = p.id
          INNER JOIN consultants c ON c.id = pp."consultantId"
          WHERE c."userId" = ${userId}
        `
      ),
    ]);

    return { projects, total: Number(totalResult[0]?.count ?? 0) };
  }
}