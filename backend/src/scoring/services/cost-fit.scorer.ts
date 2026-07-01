import { Injectable } from '@nestjs/common';
import { RawConsultantDto } from '../dto/raw-consultant.dto';
import { RawProjectDto } from '../dto/raw-project.dto';
import { FactorScoreResult } from './factor-score-result.interface';

@Injectable()
export class CostFitScorer {
    score(consultant: RawConsultantDto, project: RawProjectDto): FactorScoreResult {
        const score = consultant.costToCompany <= project.billingBudgetPerHour ? 1 : 0;
        return {
            score, triggerHardExclusion: false
        }
    }
}