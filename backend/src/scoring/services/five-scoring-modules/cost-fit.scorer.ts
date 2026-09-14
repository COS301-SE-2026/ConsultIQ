import { Injectable, Logger } from '@nestjs/common';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { FactorScoreResult } from '../interfaces/factor-score-result.interface';

@Injectable()
export class CostFitScorer {
  private readonly logger = new Logger(CostFitScorer.name);

  private readonly costOverageHalfLife = 0.3;
  private readonly curveSharpness = 2;
  private readonly decayRate =
    Math.log(2) / Math.pow(this.costOverageHalfLife, this.curveSharpness);

  score(
    consultant: RawConsultantDto,
    project: RawProjectDto,
  ): FactorScoreResult {

    const baseDailyRate = consultant.costToCompany; // 8-hour day rate
    const allocation = project.requiredAllocationPercentage; // e.g., 50, 100

    const totalBudget = project.billingBudgetPerHour;

    const teamSize = (project as any).teamSize || 1;

    if (
      !baseDailyRate || baseDailyRate <= 0 ||
      !totalBudget || totalBudget <= 0 ||
      !project.startDate || !project.endDate
    ) {
      this.logger.warn(
        `Invalid financial/date data: Consultant Base Daily Rate(${baseDailyRate}), Project Budget(${totalBudget}), Dates(${project.startDate} - ${project.endDate})`,
      );

      return {
        score: 0,
        triggerHardExclusion: false,
        details: 'Invalid data: Rate, Budget, or Dates are missing/invalid',
      };
    }

    const totalWorkingDays = this.getWorkingDays(project.startDate, project.endDate);

    if (totalWorkingDays <= 0) {
      return {
        score: 0,
        triggerHardExclusion: true,
        details: 'Project duration is zero or negative working days.',
      };
    }

    const consultantDailyCost = baseDailyRate * (allocation / 100);

    const totalDailyBurnAllowed = totalBudget / totalWorkingDays;

    const allowedDailyBudgetPerConsultant = totalDailyBurnAllowed / teamSize;

    const formattedCost = consultantDailyCost.toFixed(2);
    const formattedAllowed = allowedDailyBudgetPerConsultant.toFixed(2);

    if (consultantDailyCost <= allowedDailyBudgetPerConsultant) {
      return {
        score: 1,
        triggerHardExclusion: false,
        details: `Within budget. Available: R ${formattedAllowed}/day | Consultant Cost: R ${formattedCost}/day based on ${allocation}% capacity.`,
      };
    }

    const overagePercentage = (consultantDailyCost - allowedDailyBudgetPerConsultant) / allowedDailyBudgetPerConsultant;
    const finalScore = Math.exp(
      -this.decayRate * Math.pow(overagePercentage, this.curveSharpness),
    );

    const overBudgetFormat = (overagePercentage * 100).toFixed(1);

    return {
      score: finalScore,
      triggerHardExclusion: false,
      details: `Over budget by ${overBudgetFormat}%. Available: R ${formattedAllowed}/day | Consultant Cost: R ${formattedCost}/day (adjusted for ${allocation}% capacity).`,
    };
  }

  private getWorkingDays(startDateStr: string, endDateStr: string): number {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (startDate > endDate) return 0;

    let count = 0;
    const currentDate = new Date(startDate.getTime());

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }
}