import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringFactorName } from '@prisma/client';
import {
  ScoringFactorDto,
  UpdateScoringConfigDto,
} from '../dto/update-scoring-config.dto';
import {
  UpdateProjectScoringOverrideDto,
  DeleteProjectScoringOverrideDto,
} from '../dto/update-project-scoring-override.dto';

const DEFAULT_FACTORS: ScoringFactorDto[] = [
  { factorName: ScoringFactorName.SKILL_ALIGNMENT, weight: 40, active: true },
  { factorName: ScoringFactorName.COMPETENCY_LEVEL, weight: 30, active: true },
  { factorName: ScoringFactorName.AVAILABILITY, weight: 15, active: true },
  { factorName: ScoringFactorName.LOCATION, weight: 10, active: true },
  { factorName: ScoringFactorName.COST_TO_COMPANY, weight: 5, active: true },
];

@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) { }

  // ─── Firm-Wide Config ───────────────────────────────────────────────

  async getScoringConfig() {
    const factors = await this.prisma.consultancyScoringConfig.findMany();
    if (factors.length === 0) {
      return this.seedDefaults();
    }
    return factors;
  }

  private async seedDefaults() {
    await this.prisma.consultancyScoringConfig.createMany({
      data: DEFAULT_FACTORS,
      skipDuplicates: true,
    });
    return this.prisma.consultancyScoringConfig.findMany();
  }

  async updateScoringConfig(dto: UpdateScoringConfigDto, adminUserId: string) {
    this.validateWeights(dto);

    const previousValues =
      await this.prisma.consultancyScoringConfig.findMany();

    const newValues = await this.prisma.$transaction(async (tx) => {
      for (const factor of dto.scoringFactors) {
        await tx.consultancyScoringConfig.upsert({
          where: { factorName: factor.factorName },
          update: { weight: factor.weight, active: factor.active },
          create: {
            factorName: factor.factorName,
            weight: factor.weight,
            active: factor.active,
          },
        });
      }
      return tx.consultancyScoringConfig.findMany();
    });

    await this.prisma.scoringConfigAudit.create({
      data: { adminUserId, previousValues, newValues },
    });

    return newValues;
  }

  private validateWeights(dto: UpdateScoringConfigDto): void {
    const activeFactors = dto.scoringFactors.filter((f) => f.active);

    if (activeFactors.length === 0) {
      throw new BadRequestException(
        'At least one scoring factor must be active.',
      );
    }

    const total = activeFactors.reduce((sum, f) => sum + f.weight, 0);

    if (total !== 100) {
      throw new BadRequestException(
        `Active factors weights must sum to 100. Current sum: ${total}`,
      );
    }
  }

  // ─── Project Scoring Override ────────────────────────────────────────

  async updateProjectScoringOverride(
    projectId: string,
    dto: UpdateProjectScoringOverrideDto,
    userId: string,
  ) {
    await this.validateProjectOwnership(userId, projectId);
    this.validateOverrideWeights(dto);

    return this.prisma.$transaction(async (tx) => {
      for (const factor of dto.factors) {
        await tx.projectScoringOverride.upsert({
          where: {
            projectId_factorName: { projectId, factorName: factor.factorName },
          },
          update: {
            overrideWeight: factor.overrideWeight,
            active: factor.active,
          },
          create: {
            projectId,
            factorName: factor.factorName,
            overrideWeight: factor.overrideWeight,
            active: factor.active,
          },
        });
      }
      return tx.projectScoringOverride.findMany({ where: { projectId } });
    });
  }

  async deleteProjectScoringOverride(
    projectId: string,
    dto: DeleteProjectScoringOverrideDto,
    userId: string,
  ) {
    await this.validateProjectOwnership(userId, projectId);

    if (!dto.confirm) {
      throw new BadRequestException(
        'Deletion must be explicitly confirmed by setting confirm to true.',
      );
    }

    return this.prisma.projectScoringOverride.deleteMany({
      where: { projectId },
    });
  }

  async resolveProjectWeights(projectId: string) {
    const overrides = await this.prisma.projectScoringOverride.findMany({
      where: { projectId, active: true },
    });

    if (overrides.length > 0) {
      return overrides;
    }

    return this.prisma.consultancyScoringConfig.findMany();
  }

  private async validateProjectOwnership(
    userId: string,
    projectId: string,
  ): Promise<void> {
    const record = await this.prisma.projectManager.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (!record) {
      throw new ForbiddenException(
        'Only the assigned Project Manager can manage scoring overrides for this project.',
      );
    }
  }

  private validateOverrideWeights(dto: UpdateProjectScoringOverrideDto): void {
    const activeFactors = dto.factors.filter((f) => f.active);

    if (activeFactors.length === 0) {
      throw new BadRequestException(
        'At least one scoring factor must be active.',
      );
    }

    const total = activeFactors.reduce((sum, f) => sum + f.overrideWeight, 0);

    if (total !== 100) {
      throw new BadRequestException(
        `Active factor weights must sum to exactly 100. Current sum: ${total}.`,
      );
    }
  }

  async getProjectScoringOverride(projectId: string){
    return this.prisma.projectScoringOverride.findMany({
        where: { projectId },
    });
  }
}
