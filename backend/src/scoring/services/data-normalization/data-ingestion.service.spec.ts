import { DataIngestionService } from "./data-ingestion.service";
import { NormalizationService } from "./normalization.service";
import { EntryScoringDataDto } from "../../dto/entry-data.dto";
import { CompetencyLevel } from "@prisma/client";
import { ScoringService } from "../scoring-config.service";
import { ScoringFactor } from "../../../scoring/enums/scoring-factor.enum";
import { Test, TestingModule } from "@nestjs/testing";


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
    let scoringService: jest.Mocked<ScoringService>;

    beforeEach(async () => {

        const mockScoringService = {
            resolveProjectWeights: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataIngestionService,
                NormalizationService,
                { provide: ScoringService, useValue: mockScoringService },
            ],
        }).compile();

        service = module.get<DataIngestionService>(DataIngestionService);
        scoringService = module.get(ScoringService);
    });

    describe('Active weight', () => {
        it('Resolves consultancy default config to sum to 1.0', async () => {

            scoringService.resolveProjectWeights.mockResolvedValue([
                { factorName: ScoringFactor.SKILL_ALIGNMENT, weight: 40, active: true, hardExclusionEnabled: false },
                { factorName: ScoringFactor.COMPETENCY_LEVEL, weight: 30, active: true, hardExclusionEnabled: false },
                { factorName: ScoringFactor.AVAILABILITY, weight: 15, active: true, hardExclusionEnabled: false },
                { factorName: ScoringFactor.LOCATION, weight: 10, active: true, hardExclusionEnabled: false },
                { factorName: ScoringFactor.COST_TO_COMPANY, weight: 5, active: true, hardExclusionEnabled: false },
            ] as any);

            const result = await service.ingestData({ projectId: '123', consultantId: '456' } as any);
            expect(scoringService.resolveProjectWeights).toHaveBeenCalledWith('123');

            const sum = Object.values(result.activeWeights).reduce((a, b) => a + b, 0);

            expect(sum).toBe(1)
        })

        it('Five scoring factors', async () => {
            scoringService.resolveProjectWeights.mockResolvedValue([
                { factorName: ScoringFactor.SKILL_ALIGNMENT, weight: 40, active: true, hardExclusionEnabled: false },
                { factorName: ScoringFactor.COMPETENCY_LEVEL, weight: 30, active: true, hardExclusionEnabled: false },
                { factorName: ScoringFactor.AVAILABILITY, weight: 15, active: true, hardExclusionEnabled: false },
                { factorName: ScoringFactor.LOCATION, weight: 10, active: true, hardExclusionEnabled: false },
                { factorName: ScoringFactor.COST_TO_COMPANY, weight: 5, active: true, hardExclusionEnabled: false },
            ] as any);

            const result = await service.ingestData({ projectId: '123', consultantId: '456' } as any);

            expect(result.activeFactors.size).toBe(5);
        })


    })
})