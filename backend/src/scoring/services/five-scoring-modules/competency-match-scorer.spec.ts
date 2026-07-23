import { RawConsultantDto } from "../../dto/raw-consultant.dto";
import { RawProjectDto } from "../../dto/raw-project.dto";
import { COMPETENCY_RANK } from "../../enums/competency-level.enum";
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
    const OVER_QUALIFIED_PENALTY = 0.15;

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

        expect(result.details).toBe('Competency Match: 100.0%.');
    })
    it('scores are averaged across the required skills appying over qualification penalties', async () => {
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

        const reqquiredRankA = COMPETENCY_RANK[CompetencyLevel.INTERMEDIATE];
        const consultantRankA = COMPETENCY_RANK[CompetencyLevel.EXPERT];
        const rankDiff = consultantRankA - reqquiredRankA;

        const markA = Math.max(0.7, 1.0 - (rankDiff * OVER_QUALIFIED_PENALTY))
        const markB = COMPETENCY_RANK[CompetencyLevel.BEGINNER] / COMPETENCY_RANK[CompetencyLevel.EXPERT];
        const markAverage = (markA + markB) / 2;

        expect(result.score).toBeCloseTo(markAverage, 5)

        const expectedPercentage = (markAverage * 100).toFixed(1);
        expect(result.details).toBe(`Competency Match: ${expectedPercentage}%.`)
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
        const expectedPercentage = (mark * 100).toFixed(1);
        expect(result.details).toBe(`Competency Match: ${expectedPercentage}%.`);
    })


    it('applies a penalty for overqualified consultants exceeding the required skill level', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'A', competencyLevel: CompetencyLevel.EXPERT },
            ]),
            project([
                { skillName: 'A', minimumCompetencyLevel: CompetencyLevel.BEGINNER, isMandatory: false },
            ]),
        );

        const requiredRank = COMPETENCY_RANK[CompetencyLevel.BEGINNER];
        const consultantsRank = COMPETENCY_RANK[CompetencyLevel.EXPERT];
        const rankDiff = consultantsRank - requiredRank;
        const expectedScore = Math.max(0.7, 1.0 - (rankDiff) * OVER_QUALIFIED_PENALTY);

        const expectedPercentage = (expectedScore * 100).toFixed(1);
        expect(result.details).toBe(`Competency Match: ${expectedPercentage}%.`);
    })

    it('scores 0.02 when a consultant doesnt have the required skill but they still have a skill', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'A', competencyLevel: CompetencyLevel.BEGINNER },
            ]),
            project([
                { skillName: 'B', minimumCompetencyLevel: CompetencyLevel.EXPERT, isMandatory: false },
            ]),
        );
        expect(result.score).toBeCloseTo(0.02, 5)

        expect(result.details).toBe('Competency Match: 0.0%. Bonus applied for 1 extra skill(s): +2.0%.');

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
        expect(result.details).toBe('Competency Match: 100.0%.');
    })

    it('if there are no required skills consutant scores 1.0', async () => {
        const result = scorer.score(
            consultant([]),
            project([]),
        );
        expect(result.score).toEqual(1);
        expect(result.triggerHardExclusion).toBe(false);
        expect(result.details).toBe('No specific competency levels required by project.');
    })

    it('weighs mandatory skills more than optional skills', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'A', competencyLevel: CompetencyLevel.EXPERT },
                { skillName: 'B', competencyLevel: CompetencyLevel.BEGINNER },
            ]),
            project([
                { skillName: 'A', minimumCompetencyLevel: CompetencyLevel.EXPERT, isMandatory: false },
                { skillName: 'B', minimumCompetencyLevel: CompetencyLevel.EXPERT, isMandatory: true },
            ]),
        );

        const markA = 1.0;
        const markB = COMPETENCY_RANK[CompetencyLevel.BEGINNER] / COMPETENCY_RANK[CompetencyLevel.EXPERT];


        const average = ((markA * 1.0) + (markB * 2.0)) / 3.0;

        expect(result.score).toBeCloseTo(average, 5)
        const expectedPercentage = (average * 100).toFixed(1);
        expect(result.details).toBe(`Competency Match: ${expectedPercentage}%.`);

    })



})