import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computeTeamSkillDemand } from './compute-team-skill-demand';
import { TeamSkillDemandResponse } from '../interfaces/team-skill-demand-response.interface';
import { ConsultantSkillEntry } from '../interfaces/consultant-skill-entry.interface';
import { ProjectSkillRequirement } from '../interfaces/project-skill-requirement.interface';
import { TeamConsultant } from '../interfaces/team-consultant.interface';

@Injectable()
export class TeamSkillDemandService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeamSkillDemandForManager(userId: string): Promise<TeamSkillDemandResponse> {
    const consultantIds = await this.fetchManagedConsultantIds(userId);

    if (consultantIds.length === 0) {
      throw new NotFoundException('No consultants are currently assigned to this manager.');
    }

    const [{ team, consultantSkills }, projectRequirements] = await Promise.all([
      this.fetchTeamAndSkills(consultantIds),
      this.fetchPipelineSkillRequirements(),
    ]);

    const skills = computeTeamSkillDemand(team, consultantSkills, projectRequirements);

    return { teamSize: team.length, skills };
  }

  private async fetchManagedConsultantIds(userId: string): Promise<string[]> {
    const links = await this.prisma.consultantManager.findMany({
      where: { userId },
      select: { consultantId: true },
    });
    return links.map((l) => l.consultantId);
  }

  private async fetchTeamAndSkills(
    consultantIds: string[],
  ): Promise<{ team: TeamConsultant[]; consultantSkills: ConsultantSkillEntry[] }> {
    const consultants = await this.prisma.consultant.findMany({
      where: { id: { in: consultantIds } },
      select: {
        id: true,
        user: { select: { fullName: true, email: true } },
        skills: { select: { skillId: true, competencyLevel: true } },
      },
    });

    const team: TeamConsultant[] = consultants.map((c) => ({
      consultantId: c.id,
      fullName: c.user?.fullName ?? 'Unknown consultant',
      email: c.user?.email ?? 'unknown@consultiq.com',
    }));

    const consultantSkills: ConsultantSkillEntry[] = consultants.flatMap((c) =>
      c.skills.map((s) => ({
        consultantId: c.id,
        skillId: s.skillId,
        competencyLevel: s.competencyLevel,
      })),
    );

    return { team, consultantSkills };
  }

  private async fetchPipelineSkillRequirements(): Promise<ProjectSkillRequirement[]> {
    const projects = await this.prisma.project.findMany({
      where: { status: { in: [ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS] } },
      select: {
        id: true,
        skills: {
          select: {
            skillId: true,
            competency: true,
            mandatory: true,
            skill: { select: { name: true } },
          },
        },
      },
    });

    return projects.flatMap((p) =>
      p.skills.map((s) => ({
        projectId: p.id,
        skillId: s.skillId,
        skillName: s.skill.name,
        competency: s.competency,
        mandatory: s.mandatory,
      })),
    );
  }
}