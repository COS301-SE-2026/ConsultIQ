import { RawConsultantDto } from "../../dto/raw-consultant.dto";
import { RawProjectDto } from "../../dto/raw-project.dto";
import { SkillAligmentScorer } from "./skill-alignment-scorer";
import { CompetencyLevel } from "@prisma/client";
import { ScoringFactor } from "../../enums/scoring-factor.enum";

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

describe('SkillAligmentScorer', () => {


    let scorer: SkillAligmentScorer;

    beforeEach(() => {
        scorer = new SkillAligmentScorer();
    })


    it('scores 0.0 when consultant has none of the required skills', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'B', competencyLevel: CompetencyLevel.INTERMEDIATE },
            ]),
            project([
                { skillName: 'A', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: false },
            ]),
        );

        expect(result.score).toBe(0.0)

        expect(result.detail).toEqual({
            factor: ScoringFactor.SKILL_ALIGNMENT,
            requiredSkills: 1,
            possessedSkills: 0,
            missingSkills: ['A'],
        })
    })
    it('scores 0.75 when consultant has 3 of required skills', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'A', competencyLevel: CompetencyLevel.INTERMEDIATE },
                { skillName: 'B', competencyLevel: CompetencyLevel.INTERMEDIATE },
                { skillName: 'C', competencyLevel: CompetencyLevel.INTERMEDIATE },
            ]),
            project([
                { skillName: 'A', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: false },
                { skillName: 'B', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: false },
                { skillName: 'C', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: false },
                { skillName: 'D', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: false },
            ]),
        );

        expect(result.score).toBe(0.75)

        expect(result.detail).toEqual({
            factor: ScoringFactor.SKILL_ALIGNMENT,
            requiredSkills: 4,
            possessedSkills: 3,
            missingSkills: ['D'],
        })
    })


    it('scores 1.0 when consultant has all of the required skills', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'A', competencyLevel: CompetencyLevel.INTERMEDIATE },
            ]),
            project([
                { skillName: 'A', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: false },
            ]),
        );

        expect(result.score).toBe(1.0)

        expect(result.detail).toEqual({
            factor: ScoringFactor.SKILL_ALIGNMENT,
            requiredSkills: 1,
            possessedSkills: 1,
            missingSkills: [],
        })
    })


    it('list missing required skills', async () => {
        const result = scorer.score(
            consultant([]),
            project([
                { skillName: 'A', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: true },
                { skillName: 'B', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: true },
            ]),
        );

        expect(result.missingMandatorySkills).toEqual(['A', 'B']);
        expect(result.detail).toEqual({
            factor: ScoringFactor.SKILL_ALIGNMENT,
            requiredSkills: 2,
            possessedSkills: 0,
            missingSkills: ['A', 'B'],
        })
    })



    it('if there are no required skills consutant scores 1.0', async () => {
        const result = scorer.score(
            consultant([]),
            project([]),
        );
        expect(result.score).toBe(1);
        expect(result.triggerHardExclusion).toBe(false);
        expect(result.detail).toEqual({
            factor: ScoringFactor.SKILL_ALIGNMENT,
            requiredSkills: 0,
            possessedSkills: 0,
            missingSkills: [],
        })
    })

})