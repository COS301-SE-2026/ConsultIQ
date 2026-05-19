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
}

