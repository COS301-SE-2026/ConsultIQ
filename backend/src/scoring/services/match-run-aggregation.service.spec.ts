import { MatchRunAggregationService, ScoredConsultantInput } from "./match-run-aggregation.service";
import { WeightedAggregator } from "./weight-aggregator/weighted-aggregator";
import { ScoringFactor } from "../enums/scoring-factor.enum";
import { ConsultantMatchResult } from "./interfaces/match-result.interface";

describe('MatchRunAggregationService', () => {
    let service: MatchRunAggregationService;

    let mockWeightAggregator: jest.Mocked<WeightedAggregator>;

    beforeEach(() => {
        mockWeightAggregator = { aggregate: jest.fn(), } as unknown as jest.Mocked<WeightedAggregator>;
        service = new MatchRunAggregationService(mockWeightAggregator);
    })

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should handle empty lists or a list where all are excluded', () => {
        const mockInput: ScoredConsultantInput[] = [
            {
                consultantId: 'consultant-01',
                consultantName: 'Ashe',
                consultantEmail: 'Ashe@gmail.com',
                isPlaced: false,
                outcome: {
                    excluded: true,
                    reason: 'Over budget',
                    missingMandatorySkills: [],
                }
            }
        ];

        mockWeightAggregator.aggregate.mockReturnValue([]);

        const result = service.buildResults(mockInput);
        expect(mockWeightAggregator.aggregate).toHaveBeenCalledWith([]);
        expect(result).toEqual([]);
    })

    it('should handle empty lists or a list where all are excluded', () => {
        const mockInput: ScoredConsultantInput[] = [
            {
                consultantId: 'consultant-01',
                consultantName: 'Goku',
                consultantEmail: 'Goku@gmail.com',
                isPlaced: false,
                outcome: {
                    excluded: false,
                    factorScores: { [ScoringFactor.SKILL_ALIGNMENT]: 0.8 },
                    redistributedWeights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.4 },
                    factorDetails: { [ScoringFactor.SKILL_ALIGNMENT]: 'Match details here' }
                }
            },
            {
                consultantId: 'consultant-02',
                consultantName: 'Satoro',
                consultantEmail: 'Satoro@gmail.com',
                isPlaced: false,
                outcome: {
                    excluded: true,
                    reason: 'Missing mandatory skill',
                    missingMandatorySkills: ['CI/CD', 'AWS'],
                }
            }
        ];

        mockWeightAggregator.aggregate.mockReturnValue([]);
        service.buildResults(mockInput);
        expect(mockWeightAggregator.aggregate).toHaveBeenCalledTimes(1);
        expect(mockWeightAggregator.aggregate).toHaveBeenCalledWith([
            {
                consultantId: 'consultant-01',
                consultantName: 'Goku',
                consultantEmail: 'Goku@gmail.com',
                isPlaced: false,
                factorScores: { [ScoringFactor.SKILL_ALIGNMENT]: 0.8 },
                weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.4 },
                factorDetails: { [ScoringFactor.SKILL_ALIGNMENT]: 'Match details here' }
            }
        ]);
    })

    it('should process all eligible consultants for a match run', async () => {
        const mockInput: ScoredConsultantInput[] = [{
            consultantId: 'consultant-01',
            consultantName: 'Domain',
            consultantEmail: 'Domain@gmail.com',
            isPlaced: false,
            outcome: {
                excluded: false,
                factorScores: { [ScoringFactor.SKILL_ALIGNMENT]: 0.8 },
                redistributedWeights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.4 },
                factorDetails: { [ScoringFactor.SKILL_ALIGNMENT]: 'Match details here' }
            }
        }];

        const mockResult: ConsultantMatchResult[] = [
            {
                consultantId: 'consultant-01',
                consultantName: 'Mugino',
                consultantEmail: 'Mugino@gmail.com',
                isPlaced: false,
                finalScore: 80,
                rank: 1,
                factorBreakdown: [],

            }];

        mockWeightAggregator.aggregate.mockReturnValue(mockResult);

        const result = service.buildResults(mockInput);

        expect(mockWeightAggregator.aggregate).toHaveBeenCalledWith([
            {
                consultantId: 'consultant-01',
                consultantName: 'Domain',
                consultantEmail: 'Domain@gmail.com',
                isPlaced: false,
                factorScores: { [ScoringFactor.SKILL_ALIGNMENT]: 0.8 },
                weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.4 },
                factorDetails: { [ScoringFactor.SKILL_ALIGNMENT]: 'Match details here' }
            }
        ]);
        expect(result).toEqual(mockResult);

    })

})