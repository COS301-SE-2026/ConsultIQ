import { MatchRunAggregationService, ScoredConsultantInput } from "./match-run-aggregation.service";
import { WeightedAggregator } from "./weighted-aggregator";
import { ScoringFactor } from "../enums/scoring-factor.enum";
import { ConsultantMatchResult } from "./match-result.interface";

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



    it('should process all eligible consultants for a match run', async () => {
        const mockInput: ScoredConsultantInput[] = [{
            consultantId: 'consultant-01',
            outcome: {
                excluded: false,
                factorScores: { [ScoringFactor.SKILL_ALIGNMENT]: 0.8 },
                redistributedWeights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.4 }
            }
        }];

        const mockResult: ConsultantMatchResult[] = [
            {
                consultantId: 'consultant-01',
                finalScore: 80,
                rank: 1,
                factorBreakdown: []
            }];

        mockWeightAggregator.aggregate.mockReturnValue(mockResult);

        const result = service.buildResults(mockInput);

        expect(mockWeightAggregator.aggregate).toHaveBeenCalledWith([
            {
                consultantId: 'consultant-01',
                factorScores: { [ScoringFactor.SKILL_ALIGNMENT]: 0.8 },
                weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.4 },
            }
        ]);
        expect(result).toEqual(mockResult);

    })

})