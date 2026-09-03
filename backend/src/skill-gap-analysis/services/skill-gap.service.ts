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

@Injectable()
export class SkillGapService {

    constructor(private readonly redisUtilityService: RedisUtilityService) {}
    async getProjectSkillGapAnalysis(projectId: string) {
        const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            skills: {
            include: { skill: true },
            },
        },
        });

        if (!project) throw new Error('Project not found');

        const requiredCount = project.teamSize;
        let coveredCount = 0;
        let atRiskCount = 0;
        let criticalCount = 0;

        const skills = await Promise.all(
        project.skills.map(async (projectSkill): Promise<SkillGapItem> => {
            const validCompetencies = getValidCompetencies(projectSkill.competency);

            const availableCount = await prisma.consultant.count({
            where: {
                availability: ConsultantAvailability.AVAILABLE,
                skills: {
                some: {
                    skillId: projectSkill.skillId,
                    competencyLevel: { in: validCompetencies },
                },
                },
            },
            });

            const coveragePercent =
            requiredCount > 0 ? (availableCount / requiredCount) * 100 : 100;

            let severity: GapSeverity = 'CRITICAL';
            if (coveragePercent >= 100) {
            severity = 'COVERED';
            coveredCount++;
            } else if (coveragePercent >= 50) {
            severity = 'AT_RISK';
            atRiskCount++;
            } else {
            criticalCount++;
            }

            return {
            skillId: projectSkill.skill.id,
            skillName: projectSkill.skill.name,
            requiredCount,
            availableCount,
            coveragePercent: Math.min(coveragePercent, 100),
            severity,
            };
        }),
        );

        const overallCoveragePercent =
        skills.length > 0
            ? skills.reduce((acc, curr) => acc + curr.coveragePercent, 0) /
            skills.length
            : 100;

        let projectSeverity: GapSeverity = 'COVERED';
        const hasCritical = skills.some((s) => s.severity === 'CRITICAL');
        const hasRisk = skills.some((s) => s.severity === 'AT_RISK');

        if (hasCritical) {
        projectSeverity = 'CRITICAL';
        } else if (hasRisk) {
        projectSeverity = 'AT_RISK';
        }

        await prisma.project.update({
        where: { id: projectId },
        data: { skillGapSeverity: projectSeverity },
        });

        await this.redisUtilityService.invalidateCacheByPattern('cache:projects:*');

        return {
        projectId: project.id,
        projectName: project.projectName,
        overallSeverity: projectSeverity,
        summary: {
            overallCoveragePercent,
            adequatelyCoveredCount: coveredCount,
            atRiskCount,
            criticalCount,
        },
        skills,
        };
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

    const portfolioSkillsMap = new Map<
      string,
      {
        skillName: string;
        requiredCount: number;
        minCompetencyNeeded: CompetencyLevel;
      }
    >();

    const alerts: ProjectGapAlert[] = [];

    for (const project of activeProjects) {
      const projectGap = await this.getProjectSkillGapAnalysis(project.id);

      const worstSeverity = projectGap.overallSeverity;

      if (worstSeverity !== 'COVERED') {
        alerts.push({
          projectId: project.id,
          projectName: project.projectName,
          severity: worstSeverity,
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
        } else {
          portfolioSkillsMap.set(ps.skillId, {
            skillName: ps.skill.name,
            requiredCount: project.teamSize,
            minCompetencyNeeded: ps.competency,
          });
        }
      });
    }

    const aggregatedSkills = await Promise.all(
      Array.from(portfolioSkillsMap.entries()).map(
        async ([skillId, data]): Promise<SkillGapItem> => {
          const validCompetencies = getValidCompetencies(
            data.minCompetencyNeeded,
          );

          const availableCount = await prisma.consultant.count({
            where: {
              availability: ConsultantAvailability.AVAILABLE,
              skills: {
                some: {
                  skillId: skillId,
                  competencyLevel: { in: validCompetencies },
                },
              },
            },
          });

          const coveragePercent = (availableCount / data.requiredCount) * 100;

          let severity: GapSeverity = 'CRITICAL';
          if (coveragePercent >= 100) {
            severity = 'COVERED';
          } else if (coveragePercent >= 50) {
            severity = 'AT_RISK';
          }

          return {
            skillId,
            skillName: data.skillName,
            requiredCount: data.requiredCount,
            availableCount,
            coveragePercent: Math.min(coveragePercent, 100),
            severity,
          };
        },
      ),
    );

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
