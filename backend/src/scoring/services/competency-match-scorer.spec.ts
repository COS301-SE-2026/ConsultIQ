import { RawConsultantDto } from "../dto/raw-consultant.dto";
import { RawProjectDto } from "../dto/raw-project.dto";
import { COMPETENCY_RANK } from "../enums/competency-level.enum";
import { ScoringFactor } from "../enums/scoring-factor.enum";
import { CompetencyMatchScorer } from "./competency-match-scorer";
import { CompetencyLevel } from "@prisma/client";


function consultant(skills: { skillName: string, competencyLevel: CompetencyLevel }[]): RawConsultantDto {
    return {
        consultantId: 'consutant-01',
        skills,
        costToCompany: 100,
        city: 'Johannesburg',
        province: 'Gauteng',

    } as RawConsultantDto;
}

function project(requiredSkills: { skillName: string, minimumCompetencyLevel: CompetencyLevel, isMandatory: boolean }[]): RawProjectDto {
    return {
        projectId: 'project-01',
        requiredSkills,
        billingBudgetPerHour: 100,
        city: 'Johannesburg',
        province: 'Gauteng',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        requiredAllocationPercentage: 50,

    } as RawProjectDto;
}

describe('CompetencyMatchScorer', () => {


    let scorer: CompetencyMatchScorer;

    beforeEach(() => {
        scorer = new CompetencyMatchScorer();
    })


    it('scores consultant 1.0 for meeting min skill requirment', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'B', competencyLevel: CompetencyLevel.INTERMEDIATE },
            ]),
            project([
                { skillName: 'B', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: false },
            ]),
        );

        expect(result.score).toBe(1.0)

        expect(result.detail).toEqual({
            factor: ScoringFactor.COMPETENCY_MATCH,
            perSkill: [{
                skill: 'B',
                consultantLevel: CompetencyLevel.INTERMEDIATE,
                requiredLevel: CompetencyLevel.INTERMEDIATE,
                score: 1.0
            }]
        })
    })
    it('scores are averaged across the required skills', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'A', competencyLevel: CompetencyLevel.EXPERT },
                { skillName: 'B', competencyLevel: CompetencyLevel.BEGINNER },
            ]),
            project([
                { skillName: 'A', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: false },
                { skillName: 'B', minimumCompetencyLevel: CompetencyLevel.EXPERT, isMandatory: false },
            ]),
        );

        const markA = 1.0;
        const markB = COMPETENCY_RANK[CompetencyLevel.BEGINNER] / COMPETENCY_RANK[CompetencyLevel.EXPERT];
        const markAverage = (markA + markB) / 2;
        expect(result.score).toBeCloseTo(markAverage, 5)

        expect(result.detail).toEqual({
            factor: ScoringFactor.COMPETENCY_MATCH,
            perSkill: [{
                skill: 'A',
                consultantLevel: CompetencyLevel.EXPERT,
                requiredLevel: CompetencyLevel.INTERMEDIATE,
                score: markA
            },
            {
                skill: 'B',
                consultantLevel: CompetencyLevel.BEGINNER,
                requiredLevel: CompetencyLevel.EXPERT,
                score: markB
            }

            ]
        })
    })


    it('scores proportional marks when below the required skill level', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'A', competencyLevel: CompetencyLevel.BEGINNER },
            ]),
            project([
                { skillName: 'A', minimumCompetencyLevel: CompetencyLevel.EXPERT, isMandatory: false },
            ]),
        );

        const mark = COMPETENCY_RANK[CompetencyLevel.BEGINNER] / COMPETENCY_RANK[CompetencyLevel.EXPERT];
        expect(result.score).toBeCloseTo(mark, 5)
    })


    it('scores 0.0 when a consultant doesnt have the required skill', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'A', competencyLevel: CompetencyLevel.BEGINNER },
            ]),
            project([
                { skillName: 'B', minimumCompetencyLevel: CompetencyLevel.EXPERT, isMandatory: false },
            ]),
        );
        expect(result.score).toBeCloseTo(0.0, 5)

        expect(result.detail).toEqual({
            factor: ScoringFactor.COMPETENCY_MATCH,
            perSkill: [{
                skill: 'B',
                consultantLevel: 'NONE',
                requiredLevel: CompetencyLevel.EXPERT,
                score: 0.0
            }]
        })

    })


    it('scores 1.0 if required skill level are undefined or malformed', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'A', competencyLevel: CompetencyLevel.BEGINNER },
            ]),
            project([
                { skillName: 'A', minimumCompetencyLevel: 'wrong' as any, isMandatory: false },
            ]),
        );
        expect(result.score).toEqual(1.0)
    })

    it('if there are no required skills consutant scores 1.0', async () => {
        const result = scorer.score(
            consultant([]),
            project([]),
        );
        expect(result.score).toEqual(1);
        expect(result.triggerHardExclusion).toBe(false);
    })

})