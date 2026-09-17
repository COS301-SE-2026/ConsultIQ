import { RawConsultantDto } from "../../dto/raw-consultant.dto";
import { RawProjectDto } from "../../dto/raw-project.dto";
import { SkillAligmentScorer } from "./skill-alignment-scorer";
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
        expect(result.details).toBe('Optional skill(s): 0/1 Matched (Missing: A)')
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
        expect(result.details).toBe('Optional skill(s): 3/4 Matched (Missing: D)')
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
        expect(result.details).toBe('Optional skill(s): 1/1 Matched')
    })

    it('list missing required skills', async () => {
        const result = scorer.score(
            consultant([
                { skillName: 'C', competencyLevel: CompetencyLevel.INTERMEDIATE }
            ]),
            project([
                { skillName: 'A', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: true },
                { skillName: 'B', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: true },
            ]),
        );

        expect(result.missingMandatorySkills).toEqual(['A', 'B']);
        expect(result.details).toBe('Mandatory skill(s): 0/2 Matched (Missing: A, B)')
    })

    it('scores 0.0 and triggers hard exclusion if there are no required skills', async () => {
        const result = scorer.score(
            consultant([{ skillName: 'Java', competencyLevel: CompetencyLevel.INTERMEDIATE }]),
            project([]),
        );
        expect(result.score).toBe(0.0);
        expect(result.triggerHardExclusion).toBe(true);
        expect(result.details).toBe('Invalid data: Project has no required skills defined')
    })

    it('scores 0.0 and triggers hard exclusion if the consultant has no skills listed', async () => {
        const result = scorer.score(
            consultant([]),
            project([{ skillName: 'Java', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: true }]),
        );
        expect(result.score).toBe(0.0);
        expect(result.triggerHardExclusion).toBe(true);
        expect(result.details).toBe('Invalid data: Consultant has no skills listed')
    })
})