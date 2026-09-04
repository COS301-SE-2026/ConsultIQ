import { Injectable } from '@nestjs/common';
import { PrismaClient, ProjectStatus, ConsultantAvailability, CompetencyLevel } from '@prisma/client';
import { RedisUtilityService } from '../../common/services/redis-utility.service';

const prisma = new PrismaClient();

// --- interfaces ---
export type GapSeverity = 'COVERED' | 'AT_RISK' | 'CRITICAL';

export interface SkillGapItem {
  skillId: string;
  skillName: string;
  requiredCount: number;
  availableCount: number;
  coveragePercent: number;
  severity: GapSeverity;
}

export interface ProjectGapAlert {
  projectId: string;
  projectName: string;
  severity: GapSeverity;
  gappedSkills: Pick<
    SkillGapItem,
    'skillName' | 'requiredCount' | 'availableCount'
  >[];
}

interface ProjectSkillRequirement {
  skillId: string;
  competency: CompetencyLevel;
  skill: { id: string; name: string };
}

interface ProjectForGapAnalysis {
  id: string;
  projectName: string;
  teamSize: number;
  skills: ProjectSkillRequirement[];
}

//=====================================================
const COMPETENCY_RANK: Record<CompetencyLevel, number> = {
  [CompetencyLevel.BEGINNER]: 1,
  [CompetencyLevel.INTERMEDIATE]: 2,
  [CompetencyLevel.EXPERT]: 3,
};

export function getValidCompetencies(
  minCompetency: CompetencyLevel,
): CompetencyLevel[] {
  const minRank = COMPETENCY_RANK[minCompetency] || 1;
  return Object.entries(COMPETENCY_RANK)
    .filter(([, rank]) => rank >= minRank)
    .map(([level]) => level as CompetencyLevel);
}

export function classifySeverity(coveragePercent: number): GapSeverity {
  if (coveragePercent >= 100) return 'COVERED';
  if (coveragePercent >= 50) return 'AT_RISK';
  return 'CRITICAL';
}

@Injectable()
export class SkillGapService {
  constructor(private readonly redisUtilityService: RedisUtilityService) { }


  private computeSkillGap(
    project: ProjectForGapAnalysis,
    availableCountBySkillId: Map<string, number>,
  ) {
    const requiredCount = project.teamSize;

    const skills: SkillGapItem[] = project.skills.map((projectSkill) => {
      const availableCount =
        availableCountBySkillId.get(projectSkill.skillId) ?? 0;
      const coveragePercent =
        requiredCount > 0 ? (availableCount / requiredCount) * 100 : 100;

      return {
        skillId: projectSkill.skill.id,
        skillName: projectSkill.skill.name,
        requiredCount,
        availableCount,
        coveragePercent: Math.min(coveragePercent, 100),
        severity: classifySeverity(coveragePercent),
      };
    });

    const coveredCount = skills.filter((s) => s.severity === 'COVERED').length;
    const atRiskCount = skills.filter((s) => s.severity === 'AT_RISK').length;
    const criticalCount = skills.filter((s) => s.severity === 'CRITICAL').length;

    const overallCoveragePercent =
      skills.length > 0
        ? skills.reduce((acc, curr) => acc + curr.coveragePercent, 0) /
        skills.length
        : 100;

    let overallSeverity: GapSeverity = 'COVERED';
    if (criticalCount > 0) overallSeverity = 'CRITICAL';
    else if (atRiskCount > 0) overallSeverity = 'AT_RISK';

    return {
      projectId: project.id,
      projectName: project.projectName,
      overallSeverity,
      summary: {
        overallCoveragePercent,
        adequatelyCoveredCount: coveredCount,
        atRiskCount,
        criticalCount,
      },
      skills,
    };
  }

  private async getAvailableCountsBySkillCompetency(
    requirements: { skillId: string; minCompetency: CompetencyLevel }[],
  ): Promise<Map<string, number>> {
    const unique = new Map<
      string,
      { skillId: string; minCompetency: CompetencyLevel }
    >();
    for (const req of requirements) {
      unique.set(`${req.skillId}::${req.minCompetency}`, req);
    }

    const entries = await Promise.all(
      Array.from(unique.entries()).map(async ([key, req]) => {
        const validCompetencies = getValidCompetencies(req.minCompetency);
        const availableCount = await prisma.consultant.count({
          where: {
            availability: ConsultantAvailability.AVAILABLE,
            skills: {
              some: {
                skillId: req.skillId,
                competencyLevel: { in: validCompetencies },
              },
            },
          },
        });
        return [key, availableCount] as const;
      }),
    );

    return new Map(entries);
  }

  private countsBySkillId(
    project: ProjectForGapAnalysis,
    countsByCompetencyKey: Map<string, number>,
  ): Map<string, number> {
    const bySkillId = new Map<string, number>();
    project.skills.forEach((ps) => {
      const key = `${ps.skillId}::${ps.competency}`;
      bySkillId.set(ps.skillId, countsByCompetencyKey.get(key) ?? 0);
    });
    return bySkillId;
  }

  async getProjectSkillGapAnalysis(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { skills: { include: { skill: true } } },
    });

    if (!project) throw new Error('Project not found');

    const countsByCompetencyKey = await this.getAvailableCountsBySkillCompetency(
      project.skills.map((ps) => ({
        skillId: ps.skillId,
        minCompetency: ps.competency,
      })),
    );

    const result = this.computeSkillGap(
      project,
      this.countsBySkillId(project, countsByCompetencyKey),
    );

    await prisma.project.update({
      where: { id: projectId },
      data: { skillGapSeverity: result.overallSeverity },
    });
    await this.redisUtilityService.invalidateCacheByPattern('cache:projects:*');

    return result;
  }

  async getPortfolioSkillGapAnalysis() {
    const activeProjects = await prisma.project.findMany({
      where: {
        status: { in: [ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS] },
      },
      include: {
        skills: { include: { skill: true } },
      },
    });

    // One batch of consultant-count queries for every (skill, competency
    // floor) pair that appears anywhere in the active portfolio.
    const allRequirements = activeProjects.flatMap((project) =>
      project.skills.map((ps) => ({
        skillId: ps.skillId,
        minCompetency: ps.competency,
      })),
    );
    const countsByCompetencyKey = await this.getAvailableCountsBySkillCompetency(
      allRequirements,
    );

    const alerts: ProjectGapAlert[] = [];
    const severityUpdates: { id: string; severity: GapSeverity }[] = [];

    const portfolioSkillsMap = new Map<
      string,
      {
        skillName: string;
        requiredCount: number;
        minCompetencyNeeded: CompetencyLevel;
      }
    >();

    for (const project of activeProjects) {
      const projectGap = this.computeSkillGap(
        project,
        this.countsBySkillId(project, countsByCompetencyKey),
      );

      severityUpdates.push({
        id: project.id,
        severity: projectGap.overallSeverity,
      });

      if (projectGap.overallSeverity !== 'COVERED') {
        alerts.push({
          projectId: project.id,
          projectName: project.projectName,
          severity: projectGap.overallSeverity,
          gappedSkills: projectGap.skills
            .filter((s) => s.severity !== 'COVERED')
            .map((s) => ({
              skillName: s.skillName,
              requiredCount: s.requiredCount,
              availableCount: s.availableCount,
            })),
        });
      }

      project.skills.forEach((ps) => {
        const existing = portfolioSkillsMap.get(ps.skillId);
        if (existing) {
          existing.requiredCount += project.teamSize;
          if (
            COMPETENCY_RANK[ps.competency] <
            COMPETENCY_RANK[existing.minCompetencyNeeded]
          ) {
            existing.minCompetencyNeeded = ps.competency;
          }
        } else {
          portfolioSkillsMap.set(ps.skillId, {
            skillName: ps.skill.name,
            requiredCount: project.teamSize,
            minCompetencyNeeded: ps.competency,
          });
        }
      });
    }


    if (severityUpdates.length > 0) {
      await Promise.all(
        severityUpdates.map(({ id, severity }) =>
          prisma.project.update({
            where: { id },
            data: { skillGapSeverity: severity },
          }),
        ),
      );
      await this.redisUtilityService.invalidateCacheByPattern('cache:projects:*');
    }

    const aggregatedSkills: SkillGapItem[] = Array.from(
      portfolioSkillsMap.entries(),
    ).map(([skillId, data]) => {
      const key = `${skillId}::${data.minCompetencyNeeded}`;
      const availableCount = countsByCompetencyKey.get(key) ?? 0;
      const coveragePercent =
        data.requiredCount > 0
          ? (availableCount / data.requiredCount) * 100
          : 100;

      return {
        skillId,
        skillName: data.skillName,
        requiredCount: data.requiredCount,
        availableCount,
        coveragePercent: Math.min(coveragePercent, 100),
        severity: classifySeverity(coveragePercent),
      };
    });

    const coveredCount = aggregatedSkills.filter(
      (s) => s.severity === 'COVERED',
    ).length;
    const atRiskCount = aggregatedSkills.filter(
      (s) => s.severity === 'AT_RISK',
    ).length;
    const criticalCount = aggregatedSkills.filter(
      (s) => s.severity === 'CRITICAL',
    ).length;
    const overallCoveragePercent =
      aggregatedSkills.length > 0
        ? aggregatedSkills.reduce(
          (acc, curr) => acc + curr.coveragePercent,
          0,
        ) / aggregatedSkills.length
        : 100;

    return {
      summary: {
        overallCoveragePercent,
        adequatelyCoveredCount: coveredCount,
        atRiskCount,
        criticalCount,
      },
      skills: aggregatedSkills,
      alerts,
    };
  }
}