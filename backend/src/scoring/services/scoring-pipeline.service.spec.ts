import { Test, TestingModule } from '@nestjs/testing';
import { ScoringPipelineService } from './scoring-pipeline.service';
import { DataIngestionService } from './data-ingestion.service';
import { ScoringOrchestrator, ScoringResults } from './scoring.orchestrator';
import { EntryScoringDataDto } from '../dto/entry-data.dto';
import { ScoringFactor } from '../enums/scoring-factor.enum';

describe('ScoringPipelineService', () => {
    let service: ScoringPipelineService;
    let dataIngestionService: jest.Mocked<DataIngestionService>;
    let scoringOrchestrator: jest.Mocked<ScoringOrchestrator>;

    beforeEach(async () => {

        const mockedDataIngestionService = {
            ingestData: jest.fn(),
        }

        const mockScoringOrchestrator = {
            scoreConsultant: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ScoringPipelineService,
                { provide: DataIngestionService, useValue: mockedDataIngestionService },
                { provide: ScoringOrchestrator, useValue: mockScoringOrchestrator },
            ],

        }).compile();

        service = module.get<ScoringPipelineService>(ScoringPipelineService);
        dataIngestionService = module.get(DataIngestionService);
        scoringOrchestrator = module.get(ScoringOrchestrator);
    })


    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully perform data ingestion and scoring', async () => {
        const mockDto: EntryScoringDataDto = {
            consultantId: 'consultant-01',
            projectId: 'project-01',
            consultant: { consultantId: 'consultant-01', skills: [] } as any,
            project: { projectId: 'project-01', requiredSkills: [] } as any,
        };

        const mockedActiveWeights = { [ScoringFactor.SKILL_ALIGNMENT]: 0.5, [ScoringFactor.COST_FIT]: 0.5 } as any;

        const mockScoringResults: ScoringResults = {
            excluded: false,
            factorScores: { [ScoringFactor.SKILL_ALIGNMENT]: 0.8 },
            redistributedWeights: mockedActiveWeights,
        }

        dataIngestionService.ingestData.mockResolvedValue({
            consultantId: mockDto.consultantId,
            projectId: mockDto.projectId,
            activeWeights: mockedActiveWeights,
        });
        scoringOrchestrator.scoreConsultant.mockResolvedValue(mockScoringResults);

        const result = await service.scoreConsultant(mockDto);

        expect(dataIngestionService.ingestData).toHaveBeenCalledTimes(1);
        expect(dataIngestionService.ingestData).toHaveBeenCalledWith(mockDto);

        expect(scoringOrchestrator.scoreConsultant).toHaveBeenCalledTimes(1);
        expect(scoringOrchestrator.scoreConsultant).toHaveBeenCalledWith(
            mockDto.consultant,
            mockDto.project,
            mockedActiveWeights,
        );

        expect(result).toEqual(mockScoringResults);
    })

    it('should throw errors if score orchestrator fails', async () => {
        const mockDto = { consultant: {}, project: {} } as EntryScoringDataDto;

        const mockActiveWeights = { 
            [ScoringFactor.SKILL_ALIGNMENT]: 0.3,
            [ScoringFactor.COST_FIT]: 0.3,
            [ScoringFactor.COMPETENCY_MATCH]: 0.2,
            [ScoringFactor.GEOGRAPHIC_FIT]: 0.1,
            [ScoringFactor.AVAILABILITY]: 0.1,
        };
        const error = new Error('Database connection error');

        dataIngestionService.ingestData.mockResolvedValue({
            consultantId: mockDto.consultantId,
            projectId: mockDto.projectId,
            activeWeights: mockActiveWeights,
        });

        scoringOrchestrator.scoreConsultant.mockRejectedValue(error);
        await expect(service.scoreConsultant(mockDto)).rejects.toThrow('Database connection error');

        expect(dataIngestionService.ingestData).toHaveBeenCalledTimes(1);
    })
})