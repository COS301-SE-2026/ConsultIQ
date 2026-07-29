import { RawConsultantDto } from "../../dto/raw-consultant.dto";
import { RawProjectDto } from "../../dto/raw-project.dto";
import { AvailabilityFitScorer } from "./availability-fit.scorer";

function consultant(): RawConsultantDto {
    return {
        consultantId: 'consutant-01',
        skills: [],
        costToCompany: 0,
        city: 'Johannesburg',
        province: 'Gauteng',


    } as RawConsultantDto;
}

function project(requiredAllocationPercentage: number): RawProjectDto {
    return {
        projectId: 'project-01',
        requiredSkills: [],
        billingBudgetPerHour: 0,
        city: 'Johannesburg',
        province: 'Gauteng',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        requiredAllocationPercentage,

    } as RawProjectDto;
}


describe('AvailabilityFitScorer', () => {
    let scorer: AvailabilityFitScorer;

    let prisma: { projectPlacement: { findMany: jest.Mock } }
    beforeEach(() => {

        prisma = {
            projectPlacement: {
                findMany: jest.fn()
            }
        }
        scorer = new AvailabilityFitScorer(prisma as any);
    })




    it('scores 1.0 when the project requires 0% allocation', async () => {

        prisma.projectPlacement.findMany.mockResolvedValueOnce([]);
        const result = await scorer.score(consultant(), project(0))
        expect(result.score).toBe(1.0);
        expect(result.triggerHardExclusion).toBe(false);

        expect(result.details).toBe('Project requires 0% allocation.');
    })

    it('scores 1.0 when a consultant has no overlapping placements with the project', async () => {
        prisma.projectPlacement.findMany.mockResolvedValueOnce([]);
        const result = await scorer.score(consultant(), project(100));
        expect(result.score).toBe(1.0);
        expect(result.triggerHardExclusion).toBe(false);


        expect(result.details).toBe('Requires 100% capacity | Has 100% remaining');
    });

    it('scores 1.0 when a consultant has overlapping placements, with enough remaining availability', async () => {
        prisma.projectPlacement.findMany.mockResolvedValueOnce([{ allocation: 20 }, { allocation: 20 }]);
        const result = await scorer.score(consultant(), project(50));
        expect(result.score).toBe(1.0);
        expect(result.triggerHardExclusion).toBe(false);


        expect(result.details).toBe('Requires 50% capacity | Has 60% remaining');
    });

    it('scores 0.0 when a consultant has overlapping placements, with insufficient remaining availability', async () => {
        prisma.projectPlacement.findMany.mockResolvedValueOnce([{ allocation: 30 }, { allocation: 70 }]);
        const result = await scorer.score(consultant(), project(50));
        expect(result.score).toBe(0.0);

        expect(result.details).toBe('0% capacity available (Requires 50%).');
    });

    it('database error null, percentages', async () => {
        prisma.projectPlacement.findMany.mockResolvedValueOnce([{ allocation: null }, { allocation: 50 }]);
        const result = await scorer.score(consultant(), project(100));
        expect(result.score).toBe(0.5);

    });


    it('score proportionally', async () => {
        prisma.projectPlacement.findMany.mockResolvedValueOnce([{ allocation: 10 }, { allocation: 50 }]);
        const result = await scorer.score(consultant(), project(50));
        expect(result.score).toBe(0.8);


        expect(result.details).toBe('Requires 50% capacity | Has 40% remaining');

    });



})