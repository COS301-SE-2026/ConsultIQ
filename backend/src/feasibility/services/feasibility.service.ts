import { Injectable, BadRequestException } from '@nestjs/common';
import { CompetencyLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DataIngestionService } from '../../scoring/services/data-normalization/data-ingestion.service';
import { MatchScoringExecutorService } from '../../scoring/services/match-scoring-executor.service';
import { VariantGenerator } from './variant-generator';
import { FeasibilityCheckRequestDto } from '../dto/feasibility-check-request.dto';
import { RawProjectDto } from '../../scoring/dto/raw-project.dto';
import { ConsultantPoolEntry } from '../../scoring/services/interfaces/consultant-pool-entry.interface';
import { FeasibilityCheckResult } from '../interface/feasibility-result.interface';
import { FeasibilityCheckResponse } from '../interface/feasibility-response.interface';
import { randomUUID } from 'node:crypto';

@Injectable()
export class FeasibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataIngestion: DataIngestionService,
    private readonly scoringExecutor: MatchScoringExecutorService,
    private readonly variantGenerator: VariantGenerator,
  ) {}

  async checkFeasibility(
    spec: FeasibilityCheckRequestDto,
  ): Promise<FeasibilityCheckResponse> {
    // Pool + allocations are the same regardless of base vs. variant —
    // only the spec (budget/skills) differs between runs, so fetch once
    // and reuse across every scoring pass rather than re-querying per variant.
    const consultants = await this.fetchActiveConsultantPool();
    const pool = this.mapToPoolEntries(consultants);
    const allocationsByConsultant = await this.fetchAllocations(
      consultants.map((c) => c.id),
      spec,
    );

    const variants = this.variantGenerator.generate(spec);

    const [base, ...variantResults] = await Promise.all([
      this.scoreOneSpec(spec, pool, allocationsByConsultant),
      ...variants.map((v) => this.scoreOneSpec(v.spec, pool, allocationsByConsultant)),
    ]);

    return {
      ...base,
      variants: variants.map((v, i) => ({
        label: v.label,
        ...variantResults[i],
      })),
    };
  }

  private async scoreOneSpec(
    spec: FeasibilityCheckRequestDto,
    pool: ConsultantPoolEntry[],
    allocationsByConsultant: ReadonlyMap<string, number>,
  ): Promise<FeasibilityCheckResult> {
    const projectDto = this.mapSpecToRawProject(spec);

    const scoringContext = await this.dataIngestion.getProjectScoringContext(
      projectDto.projectId,
    );

    const { finalResults } = await this.scoringExecutor.scorePool(
      projectDto,
      pool,
      scoringContext,
      allocationsByConsultant,
    );

    return this.summarize(finalResults);
  }

  private mapSpecToRawProject(spec: FeasibilityCheckRequestDto): RawProjectDto {
    return {
      projectId: `draft-${randomUUID()}`,
      requiredSkills: spec.skills.map((s) => ({
        skillName: s.name,
        minimumCompetencyLevel: this.toCompetencyLevel(s.competency),
        isMandatory: s.mandatory,
      })),
      billingBudgetPerHour: spec.budget,
      teamSize: spec.teamSize,
      city: spec.city,
      province: spec.province,
      latitude: spec.latitude,
      longitude: spec.longitude,
      startDate: spec.startDate,
      endDate: spec.endDate,
      requiredAllocationPercentage: spec.allocation,
    };
  }

  private toCompetencyLevel(value: string): CompetencyLevel {
    const normalized = value.toUpperCase() as CompetencyLevel;
    if (!Object.values(CompetencyLevel).includes(normalized)) {
      throw new BadRequestException(
        `Invalid competency level: "${value}". Expected one of ${Object.values(CompetencyLevel).join(', ')}.`,
      );
    }
    return normalized;
  }

  private async fetchActiveConsultantPool() {
    return this.prisma.consultant.findMany({
      where: { user: { status: 'ACTIVE' } },
      select: {
        id: true,
        costToCompany: true,
        city: true,
        province: true,
        latitude: true,
        longitude: true,
        skills: { select: { competencyLevel: true, skill: { select: { name: true } } } },
        user: { select: { fullName: true, email: true } },
      },
    });
  }

  private mapToPoolEntries(
    consultants: Awaited<ReturnType<FeasibilityService['fetchActiveConsultantPool']>>,
  ): ConsultantPoolEntry[] {
    return consultants.map((c) => ({
      consultantId: c.id,
      consultantName: c.user?.fullName || 'Unknown consultant name',
      consultantEmail: c.user?.email || 'Unknown consultant email',
      isPlaced: false,
      consultant: {
        consultantId: c.id,
        skills: c.skills.map((s) => ({ skillName: s.skill.name, competencyLevel: s.competencyLevel })),
        costToCompany: c.costToCompany,
        city: c.city,
        province: c.province,
        latitude: c.latitude ?? undefined,
        longitude: c.longitude ?? undefined,
      },
    }));
  }

  private async fetchAllocations(
    consultantIds: string[],
    spec: FeasibilityCheckRequestDto,
  ): Promise<ReadonlyMap<string, number>> {
    const placementAllocations = await this.prisma.projectPlacement.groupBy({
      where: {
        consultantId: { in: consultantIds },
        status: { notIn: ['TERMINATED', 'CANCELLED'] },
        ...(spec.endDate ? { startDate: { lte: new Date(spec.endDate) } } : {}),
        OR: [{ endDate: { gte: new Date(spec.startDate) } }, { endDate: null }],
      },
      by: ['consultantId'],
      _sum: { allocation: true },
    });

    return new Map(placementAllocations.map((p) => [p.consultantId, p._sum.allocation ?? 0]));
  }

  private summarize(
    finalResults: Awaited<ReturnType<MatchScoringExecutorService['scorePool']>>['finalResults'],
  ): FeasibilityCheckResult {
    return {
      eligibleCount: finalResults.length,
      topScore: finalResults.length > 0 ? Math.max(...finalResults.map((r) => r.finalScore)) : 0,
    };
  }
}