import { Injectable, Logger } from '@nestjs/common';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { FactorScoreResult } from '../interfaces/factor-score-result.interface';

@Injectable()
export class CostFitScorer {
  private readonly logger = new Logger(CostFitScorer.name);
  private readonly deacreaseRate = 0.3;
  private readonly penalty = 0.2;

  score(
    consultant: RawConsultantDto,
    project: RawProjectDto,
  ): FactorScoreResult {
    const cost = consultant.costToCompany;
    const budget = project.billingBudgetPerHour;

    if (!cost || !budget || cost <= 0 || budget <= 0) {
      this.logger.warn(
        `Invalid financial data: Consultant cost(${cost}) , Project Budget (${budget})`,
      );

      return {
        score: 0,
        triggerHardExclusion: false,
        details: 'Invalid data: Cost or Budget is missing or zero',
      };
    }

    if (cost <= budget) {
      return {
        score: 1,
        triggerHardExclusion: false,
        details: `Within budget (Rate: ${cost} | Budget: ${budget})`,
      };
    }

    const overagePercentage = (cost - budget) / budget;
    const penalty = (overagePercentage / this.deacreaseRate) * this.penalty;
    const overBudgetFormat = (overagePercentage * 100).toFixed(1);
    const finalScore = Math.max(0, 1 - penalty);
    return {
      score: finalScore,
      triggerHardExclusion: false,
      details: `Over budget by ${overBudgetFormat}% (Rate: ${cost} | Budget: ${budget}). Score reduced by penalty.`,
    };
  }
}
