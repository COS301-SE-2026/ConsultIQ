import { Injectable } from '@nestjs/common';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { FactorScoreResult } from '../interfaces/factor-score-result.interface';
import { ScoringFactor } from '../../enums/scoring-factor.enum';

@Injectable()
export class GeographicFitScorer {

    private static readonly SAME_CITY_SCORE = 1.0;
    private static readonly SAME_PROVINCE_SCORE = 0.6;
    private static readonly DIFFERENT_PROVINCE_SCORE = 0.2;

    score(consultant: RawConsultantDto, project: RawProjectDto): FactorScoreResult {

        const sameCity = consultant.city.toLowerCase() === project.city.toLowerCase();
        const sameProvince = consultant.province.toLowerCase() === project.province.toLowerCase();

        let score: number;
        if (sameCity) {
            score = GeographicFitScorer.SAME_CITY_SCORE;
        } else if (sameProvince) {
            score = GeographicFitScorer.SAME_PROVINCE_SCORE;
        } else {
            score = GeographicFitScorer.DIFFERENT_PROVINCE_SCORE;
        }
        return {
            score, triggerHardExclusion: false,

            detail: {
                factor: ScoringFactor.GEOGRAPHIC_FIT,
                consultantCity: consultant.city,
                projectCity: project.city,
                consultantProvince: consultant.province,
                projectProvince: project.province,
            }
        }
    }
}