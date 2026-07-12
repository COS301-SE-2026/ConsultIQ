import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringPipelineService } from './scoring-pipeline.service';
import {
  MatchRunAggregationService,
  ScoredConsultantInput,
} from './match-run-aggregation.service';
import { DataIngestionService } from './data-normalization/data-ingestion.service';
import { ConsultantMatchResult } from './interfaces/match-result.interface';
import { RawProjectDto } from '../dto/raw-project.dto';
import { RawConsultantDto } from '../dto/raw-consultant.dto';
import { MatchRunStatus } from '@prisma/client';

@Injectable()
export class MatchRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringPipeline: ScoringPipelineService,
    private readonly aggregation: MatchRunAggregationService,
    private readonly dataIngestion: DataIngestionService,
  ) {}

  async executeMatchRun(
    projectId: string,
    executedByUserId: string,
  ): Promise<ConsultantMatchResult[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { skills: { include: { skill: true } } },
    });

    if (!project) {
      throw new NotFoundException(`Project: ${projectId} is not found`);
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
          user: { select: { fullName: true } },
        },
      });

      if (!consultants || consultants.length === 0) {
        throw new BadRequestException(
          `No consultants to match against an active project`,
        );
      }

      const projectDto = this.mapProjectToDto(project);

      //Resolve active weights with dummy consultant
      const { activeWeights } = await this.dataIngestion.ingestData({
        consultantId: 'config-r',
        projectId,
        consultant: {
          consultantId: 'config',
          skills: [],
          costToCompany: 0,
          city: '',
          province: '',
        },
        project: projectDto,
      });

      //score all consultants
      const scoredInputs: ScoredConsultantInput[] = await Promise.all(
        consultants.map(async (consultant) => {
          const consultantDto = this.mapConsultantToDto(consultant);

          const outcome = await this.scoringPipeline.scoreConsultant({
            consultantId: consultant.id,
            projectId,
            consultant: consultantDto,
            project: projectDto,
          });
          return { consultantId: consultant.id, outcome };
        }),
      );
      const results = this.aggregation.buildResults(scoredInputs);

      await this.saveMatchRun(
        projectId,
        executedByUserId,
        activeWeights,
        results,
        scoredInputs.filter((s) => s.outcome.excluded).length,
      );
      return results;
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
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const matchRun = await tx.matchRun.create({
        data: {
          projectId,
          executedByUserId,
          configurationSnapshot: activeWeights,
          totalConsultantsScored: results.length,
          totalConsultantsExcluded: excludedCount,
          status: MatchRunStatus.COMPLETED,
        },
      });
      await tx.matchRunResult.createMany({
        data: results.map((r) => ({
          matchRunId: matchRun.id,
          consultantId: r.consultantId,
          rank: r.rank,
          totalScore: r.finalScore,
          factorScores: r.factorBreakdown as any,
        })),
      });
    });
  }

  async getMatchRun(
    projectId: string,
    runId: string,
  ): Promise<ConsultantMatchResult[]> {
    const matchRun = await this.prisma.matchRun.findFirst({
      where: { id: runId, projectId },
      include: { results: true },
    });

    if (!matchRun) {
      throw new NotFoundException(
        `Match run ${runId} not found for project ${projectId}`,
      );
    }

    return matchRun.results.map((r) => ({
      consultantId: r.consultantId,
      finalScore: r.totalScore,
      rank: r.rank,
      factorBreakdown: r.factorScores as any,
    }));
  }
}
