import { RawConsultantDto } from "../../dto/raw-consultant.dto";
import { RawProjectDto } from "../../dto/raw-project.dto";
import { ScoringFactor } from "../../enums/scoring-factor.enum";
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
            factor: ScoringFactor.COST_TO_COMPANY,
            consultantRate: 100,
            projectBudget: 200,
            withinBudget: true,
            overagePercentage: 0,
        })
    })

    it('scores 0.0 when a consultants rate is zero or missing and also flags the abnormalty', async () => {
        expect(scorer.score(consultant(0), project(200)).score).toBe(0.0);

        const result = scorer.score(consultant(0), project(200));
        expect(result.detail).toEqual({
            factor: ScoringFactor.COST_TO_COMPANY,
            consultantRate: 0,
            projectBudget: 200,
            withinBudget: true,
            note: 'Invalid data: Cost or Budget is missing or zero'
        })
    })


    it('applies a penalty when the cost is above budget', async () => {
        const result = scorer.score(consultant(260), project(200));
        expect(result.score).toBe(0.8);
        expect(result.detail).toEqual({
            factor: ScoringFactor.COST_TO_COMPANY,
            consultantRate: 260,
            projectBudget: 200,
            withinBudget: false,
            overagePercentage: 30,
            appliedPenalty: 0.2,
        })
    })

    it('scores 0.0 when the consultants cost is greately above the budget', async () => {
        const result = scorer.score(consultant(500), project(200));
        expect(result.score).toBe(0.0);
        expect(result.detail).toEqual({
            factor: ScoringFactor.COST_TO_COMPANY,
            consultantRate: 500,
            projectBudget: 200,
            withinBudget: false,
            overagePercentage: 150,
            appliedPenalty: 1.0,
        })
    })

})