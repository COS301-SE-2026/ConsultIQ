import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CostFitScorer } from './cost-fit.scorer';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';

describe('CostFitScorer', () => {
    let service: CostFitScorer;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CostFitScorer],
        }).compile();

        service = module.get<CostFitScorer>(CostFitScorer);

        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Edge Cases and Invalid Data', () => {
        it('should return 0 and no hard exclusion for missing financial/date data', () => {
            const consultant = { costToCompany: 0 } as RawConsultantDto;
            const project = {
                billingBudgetPerHour: 10000,
                requiredAllocationPercentage: 100,
                startDate: '2023-10-02',
                endDate: '2023-10-06',
            } as RawProjectDto;

            const result = service.score(consultant, project);

            expect(result.score).toBe(0);
            expect(result.triggerHardExclusion).toBe(false);
            expect(result.details).toContain('Invalid data');
        });

        it('should trigger hard exclusion if total working days is 0 (weekend only)', () => {
            const consultant = { costToCompany: 5000 } as RawConsultantDto;
            const project = {
                billingBudgetPerHour: 10000,
                requiredAllocationPercentage: 100,
                startDate: '2023-10-07', // Saturday
                endDate: '2023-10-08',   // Sunday
            } as RawProjectDto;

            const result = service.score(consultant, project);

            expect(result.score).toBe(0);
            expect(result.triggerHardExclusion).toBe(true);
            expect(result.details).toContain('zero or negative working days');
        });

        it('should trigger hard exclusion if start date is after end date', () => {
            const consultant = { costToCompany: 5000 } as RawConsultantDto;
            const project = {
                billingBudgetPerHour: 10000,
                requiredAllocationPercentage: 100,
                startDate: '2023-10-06',
                endDate: '2023-10-02',
            } as RawProjectDto;

            const result = service.score(consultant, project);

            expect(result.score).toBe(0);
            expect(result.triggerHardExclusion).toBe(true);
        });
    });

    describe('Within Budget Calculations (Score = 1)', () => {
        it('should return a score of 1 when exact match on budget', () => {

            const consultant = { costToCompany: 2000 } as RawConsultantDto;
            const project = {
                billingBudgetPerHour: 5000,
                requiredAllocationPercentage: 50,
                startDate: '2023-10-02',
                endDate: '2023-10-06',
                teamSize: 1,
            } as any;

            const result = service.score(consultant, project);

            expect(result.score).toBe(1);
            expect(result.triggerHardExclusion).toBe(false);
            expect(result.details).toContain('Within budget');
        });

        it('should return a score of 1 when well under budget and account for team size', () => {

            const consultant = { costToCompany: 3000 } as RawConsultantDto;
            const project = {
                billingBudgetPerHour: 100000,
                requiredAllocationPercentage: 100,
                startDate: '2023-10-02',
                endDate: '2023-10-13', // 2 weeks (10 working days)
                teamSize: 2,
            } as any;

            const result = service.score(consultant, project);

            expect(result.score).toBe(1);
            expect(result.details).toContain('Within budget');
        });
    });

    describe('Over Budget Exponential Decay (Score < 1)', () => {
        it('should decay to exactly 0.5 at the 30% overage half-life mark', () => {
            // Allowed: 1000/day. 
            // 30% over budget = 1300/day.
            const consultant = { costToCompany: 1300 } as RawConsultantDto;
            const project = {
                billingBudgetPerHour: 5000, // 5 days = 1000/day
                requiredAllocationPercentage: 100,
                startDate: '2023-10-02',
                endDate: '2023-10-06',
                teamSize: 1,
            } as any;

            const result = service.score(consultant, project);


            expect(result.score).toBeCloseTo(0.5, 4);
            expect(result.triggerHardExclusion).toBe(false);
            expect(result.details).toContain('Over budget by 30.0%');
        });

        it('should softly penalize small overages due to curveSharpness = 2', () => {
            // Allowed: 1000/day. 
            // 10% over budget = 1100/day.
            const consultant = { costToCompany: 1100 } as RawConsultantDto;
            const project = {
                billingBudgetPerHour: 5000,
                requiredAllocationPercentage: 100,
                startDate: '2023-10-02',
                endDate: '2023-10-06',
                teamSize: 1,
            } as any;

            const result = service.score(consultant, project);

            expect(result.score).toBeCloseTo(0.925, 2);
            expect(result.score).toBeGreaterThan(0.9);
            expect(result.details).toContain('Over budget by 10.0%');
        });

        it('should heavily penalize massive overages', () => {

            const consultant = { costToCompany: 2000 } as RawConsultantDto;
            const project = {
                billingBudgetPerHour: 5000,
                requiredAllocationPercentage: 100,
                startDate: '2023-10-02',
                endDate: '2023-10-06',
                teamSize: 1,
            } as any;

            const result = service.score(consultant, project);

            expect(result.score).toBeLessThan(0.01);
            expect(result.score).toBeGreaterThan(0);
        });
    });
});