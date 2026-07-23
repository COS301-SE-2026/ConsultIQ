import { RawConsultantDto } from "../../dto/raw-consultant.dto";
import { RawProjectDto } from "../../dto/raw-project.dto";
import { GeographicFitScorer } from "./geographic-fit.scorer";

function consultant(city: string, province: string): RawConsultantDto {
    return {
        consultantId: 'consutant-01',
        skills: [],
        costToCompany: 0,
        city,
        province
    } as RawConsultantDto;
}

function project(city: string, province: string): RawProjectDto {
    return {
        projectId: 'project-01',
        requiredSkills: [],
        billingBudgetPerHour: 0,
        city,
        province,
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        requiredAllocationPercentage: 50
    } as RawProjectDto;
}




describe('GeographicFitScorer', () => {
    let scorer: GeographicFitScorer;

    beforeEach(() => {
        scorer = new GeographicFitScorer();
    })


    it('scores 1.0 for a consultant in the same city and province', async () => {
        expect(scorer.score(consultant('Johannesburg', 'Gauteng'), project('Johannesburg', 'Gauteng')).score).toBe(1.0);
        const result = scorer.score(consultant('Johannesburg', 'Gauteng'), project('Johannesburg', 'Gauteng'));
        expect(result.details).toBe('Located in the exact project city (Johannesburg, Gauteng)');
    })

    it('scores 0.6 for a consultant in the same province but different city', async () => {
        expect(scorer.score(consultant('Pretoria', 'Gauteng'), project('Johannesburg', 'Gauteng')).score).toBe(0.6);


        const result = scorer.score(consultant('Pretoria', 'Gauteng'), project('Johannesburg', 'Gauteng'));
        expect(result.details).toBe('Located in the same province (Gauteng), but a different city (Pretoria vs Johannesburg)');
    })

    it('scores 0.2 for a consultant in a different province', async () => {
        expect(scorer.score(consultant('Cape Town', 'Western Cape'), project('Johannesburg', 'Gauteng')).score).toBe(0.2);

        const result = scorer.score(consultant('Cape Town', 'Western Cape'), project('Johannesburg', 'Gauteng'));
        expect(result.details).toBe('Located in (Western Cape, Cape Town). Project requires Gauteng (Johannesburg)');
    })
})
