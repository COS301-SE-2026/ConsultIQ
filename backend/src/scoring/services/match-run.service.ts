import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
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
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

@Injectable()
export class MatchRunService {
  private static readonly SCORING_CONCURRENCY = 25;
  private readonly logger = new Logger(MatchRunService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringPipeline: ScoringPipelineService,
    private readonly aggregation: MatchRunAggregationService,
    private readonly dataIngestion: DataIngestionService,
    @Optional()
    @InjectQueue('match-run')
    private readonly matchRunQueue?: Queue,
  ) {}

  async enqueueMatchRun(
    projectId: string,
    executedByUserId: string,
  ): Promise<{ runId: string; status: 'IN_PROGRESS' }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { skills: true },
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
    }

    if (!this.matchRunQueue) {
      throw new InternalServerErrorException(
        'Match-run queue is not configured',
      );
    }

    const scoringContext =
      await this.dataIngestion.getProjectScoringContext(projectId);
    const matchRun = await this.prisma.matchRun.create({
      data: {
        project: { connect: { id: projectId } },
        executedByUser: { connect: { id: executedByUserId } },
        configurationSnapshot: scoringContext.activeWeights,
        status: MatchRunStatus.IN_PROGRESS,
      },
    });

    try {
      await this.matchRunQueue.add(
        'score-match-run',
        { runId: matchRun.id, projectId, executedByUserId },
        {
          jobId: matchRun.id,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
    } catch (error) {
      await this.markMatchRunFailed(matchRun.id, error);
      throw error;
    }

    return { runId: matchRun.id, status: 'IN_PROGRESS' };
  }

  async markMatchRunFailed(runId: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await this.prisma.matchRun.update({
      where: { id: runId },
      data: { status: MatchRunStatus.FAILED, errorMessage },
    });
  }

  async updateMatchRunProgress(runId: string, progress: number): Promise<void> {
    await this.prisma.matchRun.update({
      where: { id: runId },
      data: { progress: Math.max(0, Math.min(100, Math.round(progress))) },
    });
  }

  async getMatchRunStatus(projectId: string, runId: string) {
    const matchRun = await this.prisma.matchRun.findFirst({
      where: { id: runId, projectId },
      select: {
        id: true,
        status: true,
        progress: true,
        errorMessage: true,
      },
    });

    if (!matchRun) {
      throw new NotFoundException(
        `Match run ${runId} not found for project ${projectId}`,
      );
    }

    return {
      runId: matchRun.id,
      status: matchRun.status,
      progress: matchRun.progress,
      errorMessage: matchRun.errorMessage ?? undefined,
    };
  }

  private validateProjectForMatching(project: any): void {
    if (!project) {
      throw new NotFoundException(`Project not found`);
    }

    if (!project.skills || project.skills.length === 0) {
      throw new BadRequestException(
        `Cannot execute match run: Project has no required skills.`,
      );
    }

    if (project.status !== 'OPEN' && project.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Cannot execute match run: Project status is ${project.status}.`,
      );
    }
  }

  async executeMatchRun(
    projectId: string,
    executedByUserId: string,
    existingRunId?: string,
    onProgress?: (progress: number) => Promise<void>,
  ): Promise<{ runId: string; results: ConsultantMatchResult[] }> {
    const startedAt = performance.now();
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { skills: { include: { skill: true } } },
    });

    this.validateProjectForMatching(project);

    const consultants = await this.prisma.consultant.findMany({
      where: { user: { status: 'ACTIVE' } },
      select: {
        id: true,
        costToCompany: true,
        city: true,
        province: true,
        latitude: true,
        longitude: true,
        skills: {
          select: {
            competencyLevel: true,
            skill: { select: { name: true } },
          },
        },
        user: { select: { fullName: true, email: true } },
        placements: {
          where: {
            projectId: project?.id,
            status: 'ACTIVE',
            //placement before or during project timeline
            ...(project?.endDate
              ? { startDate: { lte: project?.endDate } }
              : {}),
            OR: [{ endDate: { gte: project?.startDate } }, { endDate: null }],
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

    const scoringContext =
      await this.dataIngestion.getProjectScoringContext(projectId);
    const dataLoadedAt = performance.now();
    await onProgress?.(25);

    const placementAllocations = await this.prisma.projectPlacement.groupBy({
      where: {
        consultantId: { in: consultants.map((consultant) => consultant.id) },
        status: { notIn: ['TERMINATED', 'CANCELLED'] },
        ...(project?.endDate ? { startDate: { lte: project.endDate } } : {}),
        OR: [{ endDate: { gte: project?.startDate } }, { endDate: null }],
      },
      by: ['consultantId'],
      _sum: { allocation: true },
    });
    const allocationsByConsultant = new Map(
      placementAllocations.map((placement) => [
        placement.consultantId,
        placement._sum.allocation ?? 0,
      ]),
    );

    //score all consultants
    const scoreConsultant = async (
      consultant: (typeof consultants)[number],
    ) => {
      const consultantDto = this.mapConsultantToDto(consultant);

      const isPlaced =
        consultant.placements && consultant.placements.length > 0;
      const outcome = await this.scoringPipeline.scoreConsultant(
        {
          consultantId: consultant.id,
          projectId,
          consultant: consultantDto,
          project: projectDto,
        },
        scoringContext,
        allocationsByConsultant,
      );
      return {
        consultantId: consultant.id,
        consultantName: consultant.user?.fullName || 'Unknown consultant name',
        consultantEmail: consultant.user?.email || 'Unknown consultant email',
        isPlaced,
        outcome,
      };
    };
    const results = await this.scoreWithConcurrency(
      consultants,
      scoreConsultant,
      MatchRunService.SCORING_CONCURRENCY,
    );
    const scoringCompletedAt = performance.now();
    await onProgress?.(75);

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
      scoringContext.activeWeights,
      finalResults,
      logicallyExcludedCount + errorCount,
      totalPlacedCount,
      existingRunId,
    );
    await onProgress?.(100);
    this.logger.log(
      JSON.stringify({
        event: 'match_run_completed',
        projectId,
        runId,
        candidateCount: consultants.length,
        resultCount: finalResults.length,
        excludedCount: logicallyExcludedCount,
        errorCount,
        concurrency: MatchRunService.SCORING_CONCURRENCY,
        loadDurationMs: Math.round(dataLoadedAt - startedAt),
        scoringDurationMs: Math.round(scoringCompletedAt - dataLoadedAt),
        persistenceDurationMs: Math.round(
          performance.now() - scoringCompletedAt,
        ),
        totalDurationMs: Math.round(performance.now() - startedAt),
      }),
    );
    return { runId, results: finalResults };
  }

  private async scoreWithConcurrency<T, R>(
    items: T[],
    scorer: (item: T) => Promise<R>,
    concurrency: number,
  ): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (true) {
        const index = nextIndex++;
        if (index >= items.length) return;

        try {
          results[index] = {
            status: 'fulfilled',
            value: await scorer(items[index]),
          };
        } catch (reason) {
          results[index] = { status: 'rejected', reason };
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(Math.max(concurrency, 1), items.length) },
        () => worker(),
      ),
    );

    return results;
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
      latitude: project.latitude,
      longitude: project.longitude,
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
      latitude: consultant.latitude,
      longitude: consultant.longitude,
    };
  }

  private async saveMatchRun(
    projectId: string,
    executedByUserId: string,
    activeWeights: Record<string, number>,
    results: ConsultantMatchResult[],
    excludedCount: number,
    placedCount: number,
    existingRunId?: string,
  ): Promise<string> {
    return await this.prisma.$transaction(async (tx) => {
      const matchRun = existingRunId
        ? await tx.matchRun.update({
            where: { id: existingRunId },
            data: {
              totalConsultantsScored: results.length,
              totalConsultantsExcluded: excludedCount,
              totalConsultantsPlaced: placedCount,
              status: MatchRunStatus.COMPLETED,
            },
          })
        : await tx.matchRun.create({
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
      await tx.matchRunResult.deleteMany({
        where: { matchRunId: matchRun.id },
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
          orderBy: { rank: 'asc' },
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
