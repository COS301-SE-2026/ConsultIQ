import { RawConsultantDto } from "../dto/raw-consultant.dto";
import { RawProjectDto } from "../dto/raw-project.dto";
import { ScoringFactor } from "../enums/scoring-factor.enum";
import { CostFitScorer } from "./cost-fit.scorer";

function consultant(costToCompany: number): RawConsultantDto {
    return {
        consultantId: 'consutant-01',
        skills: [],
        costToCompany,
        city: 'Johannesburg',
        province: 'Gauteng',

    } as RawConsultantDto;
}

function project(billingBudgetPerHour: number): RawProjectDto {
    return {
        projectId: 'project-01',
        requiredSkills: [],
        billingBudgetPerHour,
        city: 'Johannesburg',
        province: 'Gauteng',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        requiredAllocationPercentage: 50,

    } as RawProjectDto;
}


describe('CostFitScorer', () => {
    let scorer: CostFitScorer;

    beforeEach(() => {
        scorer = new CostFitScorer();
    })


    it('scores 1.0 when a consultants rate is below the project budget', async () => {
        expect(scorer.score(consultant(100), project(200)).score).toBe(1.0);

        const result = scorer.score(consultant(100), project(200));
        expect(result.detail).toEqual({
            factor: ScoringFactor.COST_FIT,
            consultantRate: 100,
            projectBudget: 200,
            withinBudget: true,
        })
    })

    it('scores 0.0 when a consultants rate is above the project budget', async () => {
        expect(scorer.score(consultant(300), project(200)).score).toBe(0.0);

        const result = scorer.score(consultant(300), project(200));
        expect(result.detail).toEqual({
            factor: ScoringFactor.COST_FIT,
            consultantRate: 300,
            projectBudget: 200,
            withinBudget: false,
        })
    })

})