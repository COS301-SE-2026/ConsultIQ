import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { CompetencyLevel, ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectRepository {
    constructor(private prisma: PrismaService) {}

     async createProject(dto: CreateProjectDto) {
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
                    requiredAllocationPercentage: dto.requiredAllocationPercentage,
                    clientBillingBudget: dto.clientBillingBudget,
                    status: ProjectStatus.OPEN,
                },

            });

            for (const skill of dto.skills) {
                const normalizedSkillName = skill.skillName.trim().toLowerCase();

                const skillRecord = await tx.skill.upsert({
                    where: { name: normalizedSkillName },
                    update: {},
                    create: { name: normalizedSkillName, category: 'General' },
                });

                await tx.projectSkill.create({
                    data: {
                        projectId: project.id,
                        skillId: skillRecord.id,
                        minimumCompetency: skill.minimumCompetency as CompetencyLevel,
                        isMandatory: skill.isMandatory,
                    }
                });
            }
            return { projectId: project.id };
        })
    }

    async getAllProjects(page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [projects, total] = await Promise.all([
            this.prisma.$queryRaw<any[]>`
            SELECT
                p.id,
                p.project_name   AS "projectName",
                p.client_name    AS "clientName",
                p.city,
                p.province,
                p.start_date     AS "startDate",
                p.end_date       AS "endDate",
                p.team_size      AS "teamSize",
                p.required_allocation_percentage AS "requiredAllocationPercentage",
                p.client_billing_budget          AS "clientBillingBudget",
                p.status,
                COUNT(ps.id)::int                AS "skillCount"
            FROM projects p
            LEFT JOIN project_skills ps ON ps.project_id = p.id
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT ${limit} OFFSET ${skip}
            `,
            this.prisma.project.count(),
        ]);

        return { projects, total };
    }
}

