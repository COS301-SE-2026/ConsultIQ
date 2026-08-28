import { Injectable, Logger } from '@nestjs/common';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { FactorScoreResult } from '../interfaces/factor-score-result.interface';
import { PrismaService } from '../../../prisma/prisma.service';

//Remaining Capacity = 100% - (Sum of allocation_percentages of all projects the consultant is currently allocated to)
//Across all projects where the start and end dates overlap
@Injectable()
export class AvailabilityFitScorer {
  private readonly prisma: PrismaService;
  private readonly logger = new Logger(AvailabilityFitScorer.name);
  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }
  async score(
    consultant: RawConsultantDto,
    project: RawProjectDto,
    preloadedAllocation?: number,
  ): Promise<FactorScoreResult> {
    let totalAllocation = preloadedAllocation;

    if (totalAllocation === undefined) {
      const dateConditions: any[] = [];

      //start date must be lesser than the endate
      if (project.endDate) {
        dateConditions.push({ startDate: { lte: project.endDate } });
      }

      dateConditions.push({
        OR: [{ endDate: { gte: project.startDate } }, { endDate: null }],
      });

      const overlapping = await this.prisma.projectPlacement.findMany({
        where: {
          consultantId: consultant.consultantId,
          // Filter out consultants that have been been removed earlier during a project
          status: { notIn: ['TERMINATED', 'CANCELLED'] },
          AND: dateConditions,
        },
        select: {
          allocation: true,
        },
      });

      totalAllocation = overlapping.reduce(
        (sum, placement) => sum + (placement.allocation ?? 0),
        0,
      );
    }

    const remainingCapacity = 100 - totalAllocation;
    const reqAlloc = project.requiredAllocationPercentage;
    const detailString = `Requires ${reqAlloc}% capacity | Has ${remainingCapacity}% remaining`;

    if (reqAlloc <= 0) {
      return {
        score: 1,
        triggerHardExclusion: false,
        details: 'Project requires 0% allocation.',
      };
    }

    if (remainingCapacity <= 0) {
      this.logger.debug(
        `Consultant Excluded [Project: ${project.projectId} | Consultant: ${consultant.consultantId}]. ` +
          `Reason: No availability - 0% capacity remaining (Requires ${reqAlloc}%).`,
      );
      return {
        score: 0,
        triggerHardExclusion: true,
        details: `0% capacity available (Requires ${reqAlloc}%).`,
      };
    }

    if (remainingCapacity >= reqAlloc) {
      return {
        score: 1,
        triggerHardExclusion: false,
        details: detailString,
      };
    }

    const score = remainingCapacity / reqAlloc;
    return {
      score,
      triggerHardExclusion: false,

      details: detailString,
    };
  }
}
