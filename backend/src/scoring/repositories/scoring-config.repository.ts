import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringFactorName } from '@prisma/client';
import { ScoringFactorDto } from '../dto/update-scoring-config.dto';

const DEFAULT_FACTORS: ScoringFactorDto[] = [
  { factorName: ScoringFactorName.SKILL_ALIGNMENT, weight: 40, active: true },
  { factorName: ScoringFactorName.COMPETENCY_LEVEL, weight: 30, active: true },
  { factorName: ScoringFactorName.AVAILABILITY, weight: 15, active: true },
  { factorName: ScoringFactorName.LOCATION, weight: 10, active: true },
  { factorName: ScoringFactorName.COST_TO_COMPANY, weight: 5, active: true },
];

@Injectable()
export class ScoringRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getScoringFactors(): Promise<ScoringFactorDto[]> {
    const factors = await this.prisma.consultancyScoringConfig.findMany();

    if (factors.length === 0) {
      return this.seedDefaults();
    }

    return factors;
  }

  async seedDefaults() {
    await this.prisma.consultancyScoringConfig.createMany({
      data: DEFAULT_FACTORS,
    });
    return this.prisma.consultancyScoringConfig.findMany();
  }

  async updateScoringConfig(factors: ScoringFactorDto[]) {
    return this.prisma.$transaction(async (tx) => {
      for (const factor of factors) {
        await tx.consultancyScoringConfig.upsert({
          where: { factorName: factor.factorName },
          update: {
            weight: factor.weight,
            active: factor.active,
          },
          create: {
            factorName: factor.factorName,
            weight: factor.weight,
            active: factor.active,
          },
        });
      }
      return tx.consultancyScoringConfig.findMany();
    });
  }

  async getAdminById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, tenantId: true },
    });
  }

  async createAuditRecord(
    adminUserId: string,
    previousValues: object,
    newValues: object,
  ) {
    return this.prisma.scoringConfigAudit.create({
      data: {
        adminUserId,
        previousValues,
        newValues,
      },
    });
  }
}
