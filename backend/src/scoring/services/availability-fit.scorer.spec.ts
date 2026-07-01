import { RawConsultantDto } from "../dto/raw-consultant.dto";
import { RawProjectDto } from "../dto/raw-project.dto";
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

    let prisma: { placement: { findMany: jest.Mock } }
    beforeEach(() => {

        prisma = {
            placement: {
                findMany: jest.fn()
            }
        }
        scorer = new AvailabilityFitScorer(prisma as any);
    })




    it('scores 1.0 when the project requires 0% allocation', async () => {

        prisma.placement.findMany.mockResolvedValueOnce([]);
        const result = await scorer.score(consultant(), project(0))
        expect(result.score).toBe(1.0);
        expect(result.triggerHardExclusion).toBe(false);
    })

    it('scores 1.0 when a consultant has no overlapping placements with the project', async () => {
        prisma.placement.findMany.mockResolvedValueOnce([]);
        const result = await scorer.score(consultant(), project(100));
        expect(result.score).toBe(1.0);
        expect(result.triggerHardExclusion).toBe(false);
    });

    it('scores 1.0 when a consultant has overlapping placements, with enough remaining availability', async () => {
        prisma.placement.findMany.mockResolvedValueOnce([{ allocationPercentage: 20 }, { allocationPercentage: 20 }]);
        const result = await scorer.score(consultant(), project(50));
        expect(result.score).toBe(1.0);
        expect(result.triggerHardExclusion).toBe(false);
    });

    it('scores 0.0 when a consultant has overlapping placements, with insufficient remaining availability', async () => {
        prisma.placement.findMany.mockResolvedValueOnce([{ allocationPercentage: 30 }, { allocationPercentage: 70 }]);
        const result = await scorer.score(consultant(), project(50));
        expect(result.score).toBe(0.0);

    });

    it('database error null, percentages', async () => {
        prisma.placement.findMany.mockResolvedValueOnce([{ allocationPercentage: null }, { allocationPercentage: 50 }]);
        const result = await scorer.score(consultant(), project(100));
        expect(result.score).toBe(0.5);

    });


    it('score proportionally', async () => {
        prisma.placement.findMany.mockResolvedValueOnce([{ allocationPercentage: 10 }, { allocationPercentage: 50 }]);
        const result = await scorer.score(consultant(), project(50));
        expect(result.score).toBe(0.8);

    });



})