import { Injectable } from '@nestjs/common';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { FactorScoreResult } from '../interfaces/factor-score-result.interface';
import { ScoringFactor } from '../../enums/scoring-factor.enum';

@Injectable()
export class CostFitScorer {
    score(consultant: RawConsultantDto, project: RawProjectDto): FactorScoreResult {
        const score = consultant.costToCompany <= project.billingBudgetPerHour ? 1 : 0;
        return {
            score, triggerHardExclusion: false,
            detail: {
                factor: ScoringFactor.COST_FIT,
                consultantRate: consultant.costToCompany,
                projectBudget: project.billingBudgetPerHour,
                withinBudget: consultant.costToCompany <= project.billingBudgetPerHour,

            }
        }
    }
}