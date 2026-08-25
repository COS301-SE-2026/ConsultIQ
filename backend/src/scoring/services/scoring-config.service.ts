import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ScoringFactorName,
  ConsultancyScoringConfig,
  ProjectScoringOverride,
} from '@prisma/client';
import {
  ScoringFactorDto,
  UpdateScoringConfigDto,
} from '../dto/update-scoring-config.dto';
import {
  UpdateProjectScoringOverrideDto,
  DeleteProjectScoringOverrideDto,
} from '../dto/update-project-scoring-override.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Inject, Optional } from '@nestjs/common';

const GLOBAL_SCORING_CONFIG_CACHE_KEY = 'scoring:config:global';
const projectScoringConfigCacheKey = (projectId: string) =>
  `scoring:config:project:${projectId}`;
const SCORING_CONFIG_CACHE_TTL = 300000;

const DEFAULT_FACTORS: ScoringFactorDto[] = [
  {
    factorName: ScoringFactorName.SKILL_ALIGNMENT,
    weight: 40,
    active: true,
    hardExclusionEnabled: false,
  },
  {
    factorName: ScoringFactorName.COMPETENCY_LEVEL,
    weight: 30,
    active: true,
    hardExclusionEnabled: false,
  },
  {
    factorName: ScoringFactorName.AVAILABILITY,
    weight: 15,
    active: true,
    hardExclusionEnabled: false,
  },
  {
    factorName: ScoringFactorName.LOCATION,
    weight: 10,
    active: true,
    hardExclusionEnabled: false,
  },
  {
    factorName: ScoringFactorName.COST_TO_COMPANY,
    weight: 5,
    active: true,
    hardExclusionEnabled: false,
  },
];

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  private readonly configLoads = new Map<string, Promise<any[]>>();
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
  ) {}

  // ─── Firm-Wide Config ───────────────────────────────────────────────

  async getScoringConfig() {
    const cached = await this.cacheManager?.get(
      GLOBAL_SCORING_CONFIG_CACHE_KEY,
    );
    if (cached) {
      this.logger.log(
        'Cache Hit: Fetched Firm-Wide Scoring config From Cache...',
      );
      return cached as ConsultancyScoringConfig[];
    }

    const pendingLoad = this.configLoads.get(GLOBAL_SCORING_CONFIG_CACHE_KEY);
    if (pendingLoad) {
      return pendingLoad as Promise<ConsultancyScoringConfig[]>;
    }

    this.logger.log('Cache Miss: Fetching Firm-Wide Scoring Config From DB...');

    const load = this.loadGlobalConfig();
    this.configLoads.set(GLOBAL_SCORING_CONFIG_CACHE_KEY, load);
    try {
      return await load as ConsultancyScoringConfig[];
    } finally {
      if (this.configLoads.get(GLOBAL_SCORING_CONFIG_CACHE_KEY) === load) {
        this.configLoads.delete(GLOBAL_SCORING_CONFIG_CACHE_KEY);
      }
    }
  }

  private async loadGlobalConfig(): Promise<ConsultancyScoringConfig[]> {
    const factors = await this.prisma.consultancyScoringConfig.findMany();
    if (factors.length === 0) {
      return this.seedDefaults();
    }
    await this.cacheManager?.set(
      GLOBAL_SCORING_CONFIG_CACHE_KEY,
      factors,
      SCORING_CONFIG_CACHE_TTL,
    );
    return factors;
  }

  private async seedDefaults() {
    await this.prisma.consultancyScoringConfig.createMany({
      data: DEFAULT_FACTORS,
      skipDuplicates: true,
    });
    const factors = await this.prisma.consultancyScoringConfig.findMany();
    await this.cacheManager?.set(
      GLOBAL_SCORING_CONFIG_CACHE_KEY,
      factors,
      SCORING_CONFIG_CACHE_TTL,
    );
    return factors;
  }

  async updateScoringConfig(dto: UpdateScoringConfigDto, adminUserId: string) {
    this.validateWeights(dto);

    const previousValues =
      await this.prisma.consultancyScoringConfig.findMany();

    const newValues = await this.prisma.$transaction(async (tx) => {
      for (const factor of dto.scoringFactors) {
        await tx.consultancyScoringConfig.upsert({
          where: { factorName: factor.factorName },
          update: {
            weight: factor.weight,
            active: factor.active,
            hardExclusionEnabled: factor.hardExclusionEnabled ?? false,
          },
          create: {
            factorName: factor.factorName,
            weight: factor.weight,
            active: factor.active,
            hardExclusionEnabled: factor.hardExclusionEnabled ?? false,
          },
        });
      }
      return tx.consultancyScoringConfig.findMany();
    });

    await this.prisma.scoringConfigAudit.create({
      data: { adminUserId, previousValues, newValues },
    });
    await this.cacheManager?.del(GLOBAL_SCORING_CONFIG_CACHE_KEY);
    this.configLoads.delete(GLOBAL_SCORING_CONFIG_CACHE_KEY);
    this.logger.log(
      'Cache Invalidate: Cleared Firm-Wide Scoring Config Cache...',
    );

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
      const overrides = await tx.projectScoringOverride.findMany({
        where: { projectId },
      });
      this.logger.log(
        `Cache Invalidate: Cleared Project Scoring Override Cache for projectId: ${projectId}`,
      );
      await this.cacheManager?.del(projectScoringConfigCacheKey(projectId));
      this.configLoads.delete(projectScoringConfigCacheKey(projectId));
      this.logger.log(
        `Cache Invalidate: Cleared Project Scoring Override Cache for projectId: ${projectId}`,
      );
      return overrides;
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

    const result = await this.prisma.projectScoringOverride.deleteMany({
      where: { projectId },
    });
    await this.cacheManager?.del(projectScoringConfigCacheKey(projectId));
    this.configLoads.delete(projectScoringConfigCacheKey(projectId));
    this.logger.log(
      `Cache Invalidate: Cleared Project Scoring Override Cache for projectId: ${projectId}`,
    );
    return result;
  }

  async resolveProjectWeights(projectId: string) {
    const cacheKey = projectScoringConfigCacheKey(projectId);
    const cachedOverrides = await this.cacheManager?.get(cacheKey);

    if (cachedOverrides) {
      this.logger.log(
        `Cache Hit: Fetched Project Scoring Overrides for projectId: ${projectId}`,
      );
      return cachedOverrides as ProjectScoringOverride[];
    }

    const pendingLoad = this.configLoads.get(cacheKey);
    if (pendingLoad) {
      return pendingLoad as Promise<ProjectScoringOverride[]>;
    }

    this.logger.log(
      `Cache Miss: Fetching Project Scoring Overrides for projectId: ${projectId} from DB...`,
    );
    const load = (async () => {
      const overrides = await this.prisma.projectScoringOverride.findMany({
        where: { projectId, active: true },
      });

      if (overrides.length > 0) {
        await this.cacheManager?.set(
          cacheKey,
          overrides,
          SCORING_CONFIG_CACHE_TTL,
        );
        return overrides;
      }

      return this.getScoringConfig();
    })();
    this.configLoads.set(cacheKey, load);
    try {
      return await load as ProjectScoringOverride[];
    } finally {
      if (this.configLoads.get(cacheKey) === load) {
        this.configLoads.delete(cacheKey);
      }
    }
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

  async getProjectScoringOverride(projectId: string) {
    return this.prisma.projectScoringOverride.findMany({
      where: { projectId },
    });
  }
}
