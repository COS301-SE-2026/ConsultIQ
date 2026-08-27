import { RawConsultantDto } from "../dto/raw-consultant.dto";
import { RawProjectDto } from "../dto/raw-project.dto";
import { AvailabilityFitScorer } from "./five-scoring-modules/availability-fit.scorer";
import { ScoringFactor } from "../enums/scoring-factor.enum";
import { CompetencyLevel } from "../enums/competency-level.enum";
import { GeographicFitScorer } from "./five-scoring-modules/geographic-fit.scorer";
import { CostFitScorer } from "./five-scoring-modules/cost-fit.scorer";
import { CompetencyMatchScorer } from "./five-scoring-modules/competency-match-scorer";
import { SkillAligmentScorer } from "./five-scoring-modules/skill-alignment-scorer";
import { ScoringOrchestrator } from "./scoring.orchestrator";
import { InternalServerErrorException } from "@nestjs/common";


const WEIGHTS: Record<ScoringFactor, number> = {
    [ScoringFactor.SKILL_ALIGNMENT]: 0.4,
    [ScoringFactor.COMPETENCY_LEVEL]: 0.3,
    [ScoringFactor.COST_TO_COMPANY]: 0.15,
    [ScoringFactor.LOCATION]: 0.1,
    [ScoringFactor.AVAILABILITY]: 0.05
};


function consultant(overrides: Partial<RawConsultantDto> = {}): RawConsultantDto {
    return {
        consultantId: 'consutant-01',
        skills: [{ skillName: 'C ++', competencyLevel: CompetencyLevel.EXPERT }],
        costToCompany: 300,
        city: 'Johannesburg',
        province: 'Gauteng',
        ...overrides

    } as RawConsultantDto;
}

function project(overrides: Partial<RawProjectDto> = {}): RawProjectDto {
    return {
        projectId: 'project-01',
        requiredSkills: [{ skillName: 'C ++', competencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: true }],
        billingBudgetPerHour: 500,
        city: 'Johannesburg',
        province: 'Gauteng',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        requiredAllocationPercentage: 50,
        ...overrides

    } as RawProjectDto;
}
const locationServiceMock = {};
function orcheStrator(emptyPlacement: boolean) {
    const prismaMock = {
        projectPlacement: {
            findMany: jest.fn().mockResolvedValue(emptyPlacement ? [] : [{ allocationPercentage: 50 }]),
        }
    }
    return new ScoringOrchestrator(
        new SkillAligmentScorer(),
        new CompetencyMatchScorer(),
        new CostFitScorer(),
        new GeographicFitScorer(locationServiceMock as any),
        new AvailabilityFitScorer(prismaMock as any),
    );
}

const ACTIVE_FACTORS = new Set<ScoringFactor>([
    ScoringFactor.SKILL_ALIGNMENT,
    ScoringFactor.COMPETENCY_LEVEL,
    ScoringFactor.COST_TO_COMPANY,
    ScoringFactor.LOCATION,
    ScoringFactor.AVAILABILITY
]);


describe('ScoringOrchestrator', () => {

    describe('Hard Exclusion', () => {
        it('applies a 15% penalty when a consultant is missing a mandatory skill', async () => {
            const orchestrator = orcheStrator(true);

            const result = await orchestrator.scoreConsultant(
                consultant({ skills: [] }),
                project(),
                WEIGHTS,
                ACTIVE_FACTORS,

            );

            expect(result.excluded).toBe(false);
            if (!result.excluded) {
                expect(result.factorDetails[ScoringFactor.SKILL_ALIGNMENT]).toContain('[-15% PENALTY APPLIED]');
            }
        })

        it('does not exclude a consultant who has all mandatory skils', async () => {
            const orchestrator = orcheStrator(true);

            const result = await orchestrator.scoreConsultant(consultant(), project(), WEIGHTS, ACTIVE_FACTORS,);
            expect(result.excluded).toBe(false);
        })

        it('does not compute other scoring factors if a consultant has been excluded', async () => {
            {
                const orchestrator = orcheStrator(true);

                const result = await orchestrator.scoreConsultant(consultant({ skills: [] }), project(), WEIGHTS, ACTIVE_FACTORS,);

                expect(result.excluded).toBe(false);
                if (!result.excluded) {
                    expect(result.factorScores[ScoringFactor.COMPETENCY_LEVEL]).toBeDefined();
                    expect(result.factorScores[ScoringFactor.COST_TO_COMPANY]).toBeDefined();
                    expect(result.factorScores[ScoringFactor.LOCATION]).toBeDefined();
                }

            }
        })

        it('handles a penalized consultant when missingMandatorySkills is undefined', async () => {
            jest.spyOn(SkillAligmentScorer.prototype, 'score').mockReturnValue({
                score: 0.5,
                triggerHardExclusion: true,
                details: 'Some details 10',
            });
            const orchestrator = orcheStrator(true);

            const result = await orchestrator.scoreConsultant(
                consultant(),
                project(),
                WEIGHTS,
                ACTIVE_FACTORS
            );

            expect(result.excluded).toBe(false);
            if (!result.excluded) {

                expect(result.factorDetails[ScoringFactor.SKILL_ALIGNMENT]).toContain('[-15% PENALTY APPLIED] Missing mandatory skills: ');
            }
        });
        it('sets the penalty notice as the sole detail when no previous details exist', async () => {
            const spy = jest.spyOn(SkillAligmentScorer.prototype, 'score').mockReturnValue({
                score: 0.5,
                triggerHardExclusion: true,
                missingMandatorySkills: ['Docker'],
                details: undefined,
            });

            const orchestrator = orcheStrator(true);
            const result = await orchestrator.scoreConsultant(
                consultant(),
                project(),
                WEIGHTS,
                ACTIVE_FACTORS
            );

            expect(result.excluded).toBe(false);
            if (!result.excluded) {
                expect(result.factorDetails[ScoringFactor.SKILL_ALIGNMENT]).toBe(
                    '[-15% PENALTY APPLIED] Missing mandatory skills: Docker'
                );
            }

            spy.mockRestore();
        });

        it('excludes a consultant when skill hard exclusion is configured', async () => {
            const orchestrator = orcheStrator(true);

            const result = await orchestrator.scoreConsultant(
                consultant({ skills: [] }),
                project(),
                WEIGHTS,
                ACTIVE_FACTORS,
                new Set([ScoringFactor.SKILL_ALIGNMENT]),
            );

            expect(result).toEqual({
                excluded: true,
                reason: 'Missing mandatory skills: C ++',
                missingMandatorySkills: ['C ++'],
            });
        });

        it('excludes a consultant when availability hard exclusion is configured', async () => {
            const orchestrator = orcheStrator(false);

            const result = await orchestrator.scoreConsultant(
                consultant(),
                project(),
                WEIGHTS,
                ACTIVE_FACTORS,
                new Set([ScoringFactor.AVAILABILITY]),
                new Map([['consutant-01', 100]]),
            );

            expect(result.excluded).toBe(true);
        });

    })

    describe('Redistributed Weights', () => {
        it('redistributes weights when an inactive factor is present', async () => {

            const orchestrator = orcheStrator(true);
            const activeWeights = new Set<ScoringFactor>([
                ScoringFactor.SKILL_ALIGNMENT,
                ScoringFactor.COMPETENCY_LEVEL,
                ScoringFactor.COST_TO_COMPANY,
                ScoringFactor.AVAILABILITY
            ]);
            const result = await orchestrator.scoreConsultant(consultant(), project(), WEIGHTS, activeWeights,);
            expect(result.excluded).toBe(false);

            if (!result.excluded) {
                expect(result.redistributedWeights[ScoringFactor.LOCATION]).toBeUndefined();

                const sum = Object.values(result.redistributedWeights).reduce((aa, weight) => aa + weight, 0);
                expect(sum).toBeCloseTo(1, 5);
            }


        })
        it('all factors are inactive', async () => {
            const ALL_INACTIVE = new Set<ScoringFactor>();

            const orchestrator = orcheStrator(true);

            await expect(orchestrator.scoreConsultant(consultant(), project(), WEIGHTS, ALL_INACTIVE,)).rejects.toThrow(InternalServerErrorException);
        });
    })

})