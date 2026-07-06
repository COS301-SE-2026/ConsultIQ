import { Injectable } from '@nestjs/common';
import { RawConsultantDto } from '../dto/raw-consultant.dto';
import { RawProjectDto } from '../dto/raw-project.dto';
import { FactorScoreResult } from './factor-score-result.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringFactor } from '../enums/scoring-factor.enum';
//Remaining Capacity = 100% - (Sum of allocation_percentages of all projects the consultant is currently allocated to)
//Across all projects where the start and end dates overlap
@Injectable()
export class AvailabilityFitScorer {
    private readonly prisma: PrismaService;

    constructor(prisma: PrismaService) {
        this.prisma = prisma;
    }
    async score(consultant: RawConsultantDto, project: RawProjectDto): Promise<FactorScoreResult> {

        const overlapping = await this.prisma.placement.findMany({
            where: {
                consultantId: consultant.consultantId,
                AND: [
                    {
                        startDate: { lte: project.endDate }
                    },
                    {
                        endDate: { gte: project.startDate }
                    }
                ],
                select: {
                    allocationPercentage: true
                }
            }
        });

        const totalAllocation = overlapping.reduce((sum, placement) => sum + (placement.allocationPercentage ?? 0), 0);

        const remainingCapacity = 100 - totalAllocation;
        if (project.requiredAllocationPercentage <= 0) {
            return {
                score: 1, triggerHardExclusion: false,
                detail: {
                    factor: ScoringFactor.AVAILABILITY,
                    requiredAvailability: project.requiredAllocationPercentage,
                    currentAvailability: remainingCapacity,
                    withinAvailability: true,
                }
            };
        }

        if (remainingCapacity <= 0) {
            return {
                score: 0, triggerHardExclusion: true,
                detail: {
                    factor: ScoringFactor.AVAILABILITY,
                    requiredAvailability: project.requiredAllocationPercentage,
                    currentAvailability: remainingCapacity,
                    withinAvailability: false,
                }
            };
        }

        if (remainingCapacity >= project.requiredAllocationPercentage) {
            return {
                score: 1, triggerHardExclusion: false,
                detail: {
                    factor: ScoringFactor.AVAILABILITY,
                    requiredAvailability: project.requiredAllocationPercentage,
                    currentAvailability: remainingCapacity,
                    withinAvailability: true,
                }
            };
        }

        const score = remainingCapacity / project.requiredAllocationPercentage;
        return {
            score, triggerHardExclusion: false,

            detail: {
                factor: ScoringFactor.AVAILABILITY,
                requiredAvailability: project.requiredAllocationPercentage,
                currentAvailability: remainingCapacity,
                withinAvailability: false,
            }
        }
    }
}