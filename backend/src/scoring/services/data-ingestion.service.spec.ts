import { DataIngestionService } from "./data-ingestion.service";
import { NormalizationService } from "./normalization.service";
import { EntryScoringDataDto } from "../dto/entry-data.dto";
import { CompetencyLevel } from "@prisma/client";

function buildDto(overrides: {
    consultantSkills?: {
        skillName: string,
        competencyLevel: CompetencyLevel,
    }[];


    requiredSkills?: {
        skillName: string,
        minimumCompetencyLevel: CompetencyLevel,
        isMandatory: boolean,
    }[];


    costToCompany?: number;
    billingBudgetPerHour?: number;
    consultantCity?: string;
    consultantProvince?: string;
    projectCity?: string;
    projectProvince?: string;
} = {}): EntryScoringDataDto {
    return {
        consultantId: 'consultant-01',
        projectId: 'project-01',

        consultant: {
            consultantId: 'consultant-01',
            skills: overrides.consultantSkills ?? [
                { skillName: 'C ++', competencyLevel: CompetencyLevel.EXPERT },
                { skillName: 'Java', competencyLevel: CompetencyLevel.INTERMEDIATE },

            ],
            costToCompany: overrides.costToCompany ?? 500,
            city: overrides.consultantCity ?? 'Pretoria',
            province: overrides.consultantProvince ?? 'Gauteng',
        },

        project: {
            projectId: 'project-01',
            requiredSkills: overrides.requiredSkills ?? [
                { skillName: 'C ++', minimumCompetencyLevel: CompetencyLevel.INTERMEDIATE, isMandatory: true },
                { skillName: 'Java', minimumCompetencyLevel: CompetencyLevel.BEGINNER, isMandatory: false },

            ],
            billingBudgetPerHour: overrides.billingBudgetPerHour ?? 600,
            city: overrides.projectCity ?? 'Pretoria',
            province: overrides.projectProvince ?? 'Gauteng',
            startDate: '2026-07-01',
            endDate: '2026-09-29',
            requiredAllocationPercentage: 80,
        },
    } as EntryScoringDataDto;
}




describe('DataIngestionService', () => {
    let service: DataIngestionService;

    beforeEach(() => {
        service = new DataIngestionService(new NormalizationService);

    });

    describe('Active weight', () => {
        it('Resolves consultancy default config to sum to 1.0', async () => {
            const result = await service.ingestData(buildDto());
            const sum = Object.values(result.activeWeights).reduce((a, b) => a + b, 0);

            expect(sum).toBe(1)
        })

        it('Five scoring factors', async () => {
            const result = await service.ingestData(buildDto());

            expect(result.activeWeights).toMatchObject({
                skillAlignment: 0.4,
                competencyMatch: 0.3,
                availability: 0.15,
                costFit: 0.1,
                geographicFit: 0.05,
            })
        })


    })
})