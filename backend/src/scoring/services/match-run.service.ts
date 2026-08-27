import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringPipelineService } from './scoring-pipeline.service';
import {
  MatchRunAggregationService,
  ScoredConsultantInput,
} from './match-run-aggregation.service';
import { DataIngestionService } from './data-normalization/data-ingestion.service';
import {
  ConsultantMatchResult,
  WeightedFactorBreakdown,
} from './interfaces/match-result.interface';
import { RawProjectDto } from '../dto/raw-project.dto';
import { RawConsultantDto } from '../dto/raw-consultant.dto';
import { MatchRunStatus, Prisma } from '@prisma/client';
import { MatchRunStats } from './interfaces/match-result.interface';

@Injectable()
export class MatchRunService {
  private readonly logger = new Logger(MatchRunService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringPipeline: ScoringPipelineService,
    private readonly aggregation: MatchRunAggregationService,
    private readonly dataIngestion: DataIngestionService,
  ) {}

  async executeMatchRun(
    projectId: string,
    executedByUserId: string,
  ): Promise<{ runId: string; results: ConsultantMatchResult[] }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { skills: { include: { skill: true } } },
    });

    if (!project) {
      throw new NotFoundException(`Project: ${projectId} is not found`);
    }
    if (!project.skills || project.skills.length === 0) {
      throw new BadRequestException(
        `Cannot execute match run: Project has no required skills.`,
      );
    }
    if (project.status !== 'OPEN' && project.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Match run can only be initialized for open and in-progress projects. Project Status is ${project.status}`,
      );
    } else {
      const consultants = await this.prisma.consultant.findMany({
        where: { user: { status: 'ACTIVE' } },
        include: {
          skills: { include: { skill: true } },
          user: { select: { fullName: true, email: true } },
          placements: {
            where: {
              projectId: project.id,
              status: 'ACTIVE',
              //placement before or during project timeline
              ...(project.endDate
                ? { startDate: { lte: project.endDate } }
                : {}),
              OR: [{ endDate: { gte: project.startDate } }, { endDate: null }],
            },
          },
        },
      });

      if (!consultants || consultants.length === 0) {
        throw new BadRequestException(
          `No consultants to match against an active project`,
        );
      }

      const projectDto = this.mapProjectToDto(project);

      //Resolve active weights with dummy consultant
      const { activeWeights } =
        await this.dataIngestion.getProjectScoringContext(projectId);

      //score all consultants
      const scoringPromises = consultants.map(async (consultant) => {
        const consultantDto = this.mapConsultantToDto(consultant);

        const isPlaced =
          consultant.placements && consultant.placements.length > 0;
        const outcome = await this.scoringPipeline.scoreConsultant({
          consultantId: consultant.id,
          projectId,
          consultant: consultantDto,
          project: projectDto,
        });
        return {
          consultantId: consultant.id,
          consultantName:
            consultant.user?.fullName || 'Unknown consultant name',
          consultantEmail: consultant.user?.email || 'Unknown consultant email',
          isPlaced,
          outcome,
        };
      });
      const results = await Promise.allSettled(scoringPromises);

      const scoredInputs: ScoredConsultantInput[] = [];
      let errorCount = 0;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          scoredInputs.push(result.value);
        } else {
          this.logger.error(`Failed to score consultant: ${result.reason}`);
          errorCount++;
        }
      }

      const finalResults = this.aggregation.buildResults(scoredInputs);
      const logicallyExcludedCount = scoredInputs.filter(
        (s) => s.outcome.excluded,
      ).length;

      const totalPlacedCount = finalResults.filter((r) => r.isPlaced).length;

      const runId = await this.saveMatchRun(
        projectId,
        executedByUserId,
        activeWeights,
        finalResults,
        logicallyExcludedCount + errorCount,
        totalPlacedCount,
      );
      return { runId, results: finalResults };
    }
  }

  private mapProjectToDto(project: any): RawProjectDto {
    return {
      projectId: project.id,
      requiredSkills: project.skills.map((a: any) => ({
        skillName: a.skill.name,
        minimumCompetencyLevel: a.competency,
        isMandatory: a.mandatory,
      })),

      billingBudgetPerHour: project.budget,
      city: project.city,
      province: project.province,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate?.toISOString(),
      requiredAllocationPercentage: project.allocation,
    };
  }

  private mapConsultantToDto(consultant: any): RawConsultantDto {
    return {
      consultantId: consultant.id,
      skills: consultant.skills.map((a: any) => ({
        skillName: a.skill.name,
        competencyLevel: a.competencyLevel,
      })),

      costToCompany: consultant.costToCompany,
      city: consultant.city,
      province: consultant.province,
    };
  }

  private async saveMatchRun(
    projectId: string,
    executedByUserId: string,
    activeWeights: Record<string, number>,
    results: ConsultantMatchResult[],
    excludedCount: number,
    placedCount: number,
  ): Promise<string> {
    return await this.prisma.$transaction(async (tx) => {
      const matchRun = await tx.matchRun.create({
        data: {
          project: { connect: { id: projectId } },
          executedByUser: { connect: { id: executedByUserId } },
          configurationSnapshot: activeWeights,
          totalConsultantsScored: results.length,
          totalConsultantsExcluded: excludedCount,
          totalConsultantsPlaced: placedCount,
          status: MatchRunStatus.COMPLETED,
        },
      });
      await tx.matchRunResult.createMany({
        data: results.map((r) => ({
          matchRunId: matchRun.id,
          consultantId: r.consultantId,
          rank: r.rank,
          totalScore: r.finalScore,
          factorScores: r.factorBreakdown as unknown as Prisma.InputJsonArray,
          isPlaced: r.isPlaced,
        })),
      });
      return matchRun.id;
    });
  }

  async getMatchRun(
    projectId: string,
    runId: string,
  ): Promise<ConsultantMatchResult[]> {
    const matchRun = await this.prisma.matchRun.findFirst({
      where: { id: runId, projectId },
      include: {
        results: {
          include: {
            consultant: {
              include: {
                user: {
                  select: {
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!matchRun) {
      throw new NotFoundException(
        `Match run ${runId} not found for project ${projectId}`,
      );
    }

    return matchRun.results.map((r) => ({
      consultantId: r.consultantId,
      consultantName: r.consultant?.user?.fullName || 'Unknown',
      consultantEmail: r.consultant?.user?.email || 'consultIq@consultant.com',
      finalScore: r.totalScore,
      rank: r.rank,
      factorBreakdown: r.factorScores as unknown as WeightedFactorBreakdown[],
      isPlaced: r.isPlaced,
    }));
  }

  async getMatchRunStats(
    projectId: string,
    runId: string,
  ): Promise<MatchRunStats> {
    const matchRun = await this.prisma.matchRun.findUnique({
      where: { id: runId, projectId },
      select: {
        totalConsultantsScored: true,
        totalConsultantsExcluded: true,
        totalConsultantsPlaced: true,
      },
    });

    if (!matchRun) {
      throw new NotFoundException(`Match run ${runId} not found`);
    }

    return {
      totalEvaluated:
        matchRun.totalConsultantsScored + matchRun.totalConsultantsExcluded,
      totalExcluded: matchRun.totalConsultantsExcluded,
      totalMatched: matchRun.totalConsultantsScored,
      totalPlaced: matchRun.totalConsultantsPlaced,
    };
  }
}
