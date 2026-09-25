import { RawConsultantDto } from "../../dto/raw-consultant.dto";
import { RawProjectDto } from "../../dto/raw-project.dto";
import { AvailabilityFitScorer } from "./availability-fit.scorer";
import { WorkModel } from "@prisma/client";

function consultant(): RawConsultantDto {
    return {
        consultantId: 'consutant-01',
        skills: [],
        costToCompany: 0,
        city: 'Johannesburg',
        province: 'Gauteng',


    } as RawConsultantDto;
}

function project(
    requiredAllocationPercentage: number,
    workModel?: WorkModel,
): RawProjectDto {
    return {
        projectId: 'project-01',
        requiredSkills: [],
        billingBudgetPerHour: 0,
        city: 'Johannesburg',
        province: 'Gauteng',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        requiredAllocationPercentage,
        teamSize: 1,
        workModel,

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


    describe('Remote projects', () => {
        it('scores 1.0 and skips capacity lookup entirely for a Remote project', async () => {
            const result = await scorer.score(
                consultant(),
                project(100, WorkModel.REMOTE),
            );

            expect(result.score).toBe(1.0);
            expect(result.triggerHardExclusion).toBe(false);
            expect(result.details).toBe('Project is Remote');
            expect(prisma.projectPlacement.findMany).not.toHaveBeenCalled();
        });

        it('scores 1.0 for a Remote project even when a preloaded allocation would otherwise exceed the capacity', async () => {
            const result = await scorer.score(
                consultant(),
                project(100, WorkModel.REMOTE),
                150,
            );

            expect(result.score).toBe(1.0);
            expect(result.triggerHardExclusion).toBe(false);
            expect(result.details).toBe('Project is Remote');
        });

        it('scores 1.0 for a Remote project regardless of required allocation percentage', async () => {
            const result = await scorer.score(
                consultant(),
                project(0, WorkModel.REMOTE),
            );

            expect(result.score).toBe(1.0);
            expect(result.details).toBe('Project is Remote');
        });
    });

    describe('Onsite and Hybrid projects (identical capacity-based calculation)', () => {

        it.each([WorkModel.ONSITE, WorkModel.HYBRID])(
            'scores 1.0 when the project requires 0% allocation', async (workModel) => {
            prisma.projectPlacement.findMany.mockResolvedValueOnce([]);
            const result = await scorer.score(consultant(), project(0))
            expect(result.score).toBe(1.0);
            expect(result.triggerHardExclusion).toBe(false);

            expect(result.details).toBe('Project requires 0% allocation.');
        })

        it.each([WorkModel.ONSITE, WorkModel.HYBRID])(
            'scores 1.0 when a consultant has no overlapping placements with the project',
            async (workModel) => {
            prisma.projectPlacement.findMany.mockResolvedValueOnce([]);
            const result = await scorer.score(consultant(), project(100));
            expect(result.score).toBe(1.0);
            expect(result.triggerHardExclusion).toBe(false);


            expect(result.details).toBe('Requires 100% capacity | Has 100% remaining');
        });

        it.each([WorkModel.ONSITE, WorkModel.HYBRID])(
            'scores 1.0 when a consultant has overlapping placements, with enough remaining availability',
            async (workModel) => {
            prisma.projectPlacement.findMany.mockResolvedValueOnce([{ allocation: 20 }, { allocation: 20 }]);
            const result = await scorer.score(consultant(), project(50));
            expect(result.score).toBe(1.0);
            expect(result.triggerHardExclusion).toBe(false);


            expect(result.details).toBe('Requires 50% capacity | Has 60% remaining');
        });

        it.each([WorkModel.ONSITE, WorkModel.HYBRID])(
            'scores 0.0 when a consultant has overlapping placements, with insufficient remaining availability',
            async (workModel) => {
            prisma.projectPlacement.findMany.mockResolvedValueOnce([{ allocation: 30 }, { allocation: 70 }]);
            const result = await scorer.score(consultant(), project(50));
            expect(result.score).toBe(0.0);

            expect(result.details).toBe('0% capacity available (Requires 50%).');
        });


        it.each([WorkModel.ONSITE, WorkModel.HYBRID])(
            'score proportionally', async (workModel) => {
            prisma.projectPlacement.findMany.mockResolvedValueOnce([{ allocation: 10 }, { allocation: 50 }]);
            const result = await scorer.score(consultant(), project(50, workModel));
            expect(result.score).toBe(0.8);

            expect(result.details).toBe(
                'Requires 50% capacity | Has 40% remaining',
            );
        });
    })

    it('database error null, percentages', async () => {
        prisma.projectPlacement.findMany.mockResolvedValueOnce([{ allocation: null }, { allocation: 50 }]);
        const result = await scorer.score(consultant(), project(100));
        expect(result.score).toBe(0.5);
    });
})