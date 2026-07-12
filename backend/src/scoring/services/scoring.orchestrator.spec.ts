import { RawConsultantDto } from "../dto/raw-consultant.dto";
import { RawProjectDto } from "../dto/raw-project.dto";
import { AvailabilityFitScorer } from "./five-scoring-modules/availability-fit.scorer";
import { ScoringFactor } from "../enums/scoring-factor.enum";
import { CompetencyLevel } from "../enums/competency-level.enum";
import { FactorActivationConfig } from "./factor-activation.config";
import { GeographicFitScorer } from "./five-scoring-modules/geographic-fit.scorer";
import { CostFitScorer } from "./five-scoring-modules/cost-fit.scorer";
import { CompetencyMatchScorer } from "./five-scoring-modules/competency-match-scorer";
import { SkillAligmentScorer } from "./five-scoring-modules/skill-alignment-scorer";
import { ScoringOrchestrator } from "./scoring.orchestrator";


const WEIGHTS: Record<ScoringFactor, number> = {
    [ScoringFactor.SKILL_ALIGNMENT]: 0.4,
    [ScoringFactor.COMPETENCY_MATCH]: 0.3,
    [ScoringFactor.COST_FIT]: 0.15,
    [ScoringFactor.GEOGRAPHIC_FIT]: 0.1,
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

function orcheStrator(activationConfig: FactorActivationConfig, emptyPlacement: boolean) {
    const prismaMock = {
        projectPlacement: {
            findMany: jest.fn().mockResolvedValue(emptyPlacement ? [] : [{ allocationPercentage: 50 }]),
        }
    }
    return new ScoringOrchestrator(
        new SkillAligmentScorer(),
        new CompetencyMatchScorer(),
        new CostFitScorer(),
        new GeographicFitScorer(),
        new AvailabilityFitScorer(prismaMock as any),
        activationConfig
    );
}

const ACTIVE_FACTORS: FactorActivationConfig = {
    isActive: {
        [ScoringFactor.SKILL_ALIGNMENT]: true,
        [ScoringFactor.COMPETENCY_MATCH]: true,
        [ScoringFactor.COST_FIT]: true,
        [ScoringFactor.GEOGRAPHIC_FIT]: true,
        [ScoringFactor.AVAILABILITY]: true
    },
    hardExclusion: true
};
describe('ScoringOrchestrator', () => {

    describe('Hard Exclusion', () => {
        it('exludes a consultant missing a mandatory skill', async () => {
            const orchestrator = orcheStrator(ACTIVE_FACTORS, true);

            const result = await orchestrator.scoreConsultant(
                consultant({ skills: [] }),
                project(),
                WEIGHTS
            );

            expect(result.excluded).toBe(true);
            if (result.excluded) {
                expect(result.missingMandatorySkills).toEqual(['C ++']);
            }
        })

        it('does not exclude a consultant who has all mandatory skils', async () => {
            const orchestrator = orcheStrator(ACTIVE_FACTORS, true);

            const result = await orchestrator.scoreConsultant(consultant(), project(), WEIGHTS);
            expect(result.excluded).toBe(false);
        })

        it('does not compute other scoring factors if a consultant has been excluded', async () => {
            {
                const orchestrator = orcheStrator(ACTIVE_FACTORS, true);

                const result = await orchestrator.scoreConsultant(consultant({ skills: [] }), project(), WEIGHTS);

                expect(result.excluded).toBe(true);
                expect((result as any).factorScores).toBeUndefined();
            }
        })

    })

    describe('Redistributed Weights', () => {
        it('redistributes weights when an inactive factor is present', async () => {

            const config: FactorActivationConfig = {
                ...ACTIVE_FACTORS,
                isActive: {
                    ...ACTIVE_FACTORS.isActive, [ScoringFactor.GEOGRAPHIC_FIT]: false
                },
            }

            const orchestrator = orcheStrator(config, true);

            const result = await orchestrator.scoreConsultant(consultant(), project(), WEIGHTS);
            expect(result.excluded).toBe(false);

            if (!result.excluded) {
                expect(result.redistributedWeights[ScoringFactor.GEOGRAPHIC_FIT]).toBeUndefined();

                const sum = Object.values(result.redistributedWeights).reduce((aa, weight) => aa + weight, 0);
                expect(sum).toBeCloseTo(1, 5);
            }


        })
        it('all factors are inactive', async () => {
            const ALL_INACTIVE: FactorActivationConfig = {
                isActive: {
                    [ScoringFactor.SKILL_ALIGNMENT]: false,
                    [ScoringFactor.COMPETENCY_MATCH]: false,
                    [ScoringFactor.COST_FIT]: false,
                    [ScoringFactor.GEOGRAPHIC_FIT]: false,
                    [ScoringFactor.AVAILABILITY]: false
                },
                hardExclusion: true
            };

            const orchestrator = orcheStrator(ALL_INACTIVE, true);

            const result = await orchestrator.scoreConsultant(consultant(), project(), WEIGHTS);

            expect(result.excluded).toBe(false);

            if (!result.excluded) {
                expect(result.redistributedWeights).toEqual({});
            }
        });
    })

})