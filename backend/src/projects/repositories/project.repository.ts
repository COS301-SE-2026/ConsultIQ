import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { CompetencyLevel, ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectRepository {
  constructor(private prisma: PrismaService) { }

  async createProject(dto: CreateProjectDto) {
    return await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          projectName: dto.projectName,
          clientName: dto.clientName,
          description: dto.description,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          suburb: dto.suburb,
          city: dto.city,
          province: dto.province,
          postalCode: dto.postalCode || '',
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          teamSize: dto.teamSize,
          allocation: dto.allocation,
          budget: dto.budget,
          status: ProjectStatus.OPEN,
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
            years: skill.years,
            mandatory: skill.mandatory,
          },
        });
      }
      return { projectId: project.id };
    });
  }
}
