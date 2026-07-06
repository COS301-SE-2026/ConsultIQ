import { WeightedAggregator, ScoredConsultant } from "./weighted-aggregator";
import { ScoringFactor } from "../enums/scoring-factor.enum";

const WEIGHTS: Partial<Record<ScoringFactor, number>> = {
    [ScoringFactor.SKILL_ALIGNMENT]: 0.4,
    [ScoringFactor.COMPETENCY_MATCH]: 0.3,
    [ScoringFactor.AVAILABILITY]: 0.15,
    [ScoringFactor.COST_FIT]: 0.1,
    [ScoringFactor.GEOGRAPHIC_FIT]: 0.05,

}


describe('WeightedAggregator', () => {
    let aggregator: WeightedAggregator;

    beforeEach(() => {
        aggregator = new WeightedAggregator();
    })

    it('calcuates the weighted score as the weighted sum of factor scores', () => {

        const consultant: ScoredConsultant = {
            consultantId: 'consultant-01',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 1,
                [ScoringFactor.COMPETENCY_MATCH]: 1,
                [ScoringFactor.AVAILABILITY]: 1,
                [ScoringFactor.COST_FIT]: 1,
                [ScoringFactor.GEOGRAPHIC_FIT]: 1,
            },
            weights: WEIGHTS,
        };

        const [result] = aggregator.aggregate([consultant]);
        expect(result.finalScore).toBe(100);
    })

    it('partial weighted sum calculated correctly', () => {

        const consultant: ScoredConsultant = {
            consultantId: 'consultant-01',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
                [ScoringFactor.COMPETENCY_MATCH]: 0.5,
                [ScoringFactor.AVAILABILITY]: 1,
                [ScoringFactor.COST_FIT]: 0,
                [ScoringFactor.GEOGRAPHIC_FIT]: 0.6,
            },
            weights: WEIGHTS,
        };

        const [result] = aggregator.aggregate([consultant]);
        expect(result.finalScore).toBe(63);
    })

    it('returned ranked list of consultants', () => {

        const c1: ScoredConsultant = {
            consultantId: 'c1',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
            },
            weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.2, },
        };

        const c2: ScoredConsultant = {
            consultantId: 'c2',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
            },
            weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.9, },
        };

        const c3: ScoredConsultant = {
            consultantId: 'c3',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
            },
            weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.5, },
        };

        const result = aggregator.aggregate([c1, c2, c3]);
        expect(result.map((r) => r.consultantId)).toEqual(['c2', 'c3', 'c1']);
    })


    it('assigns appropriate ranks to consultants', () => {

        const c1: ScoredConsultant = {
            consultantId: 'c1',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
            },
            weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.2, },
        };

        const c2: ScoredConsultant = {
            consultantId: 'c2',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
            },
            weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.9, },
        };

        const c3: ScoredConsultant = {
            consultantId: 'c3',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
            },
            weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.5, },
        };

        const result = aggregator.aggregate([c1, c2, c3]);
        expect(result.find((r) => r.consultantId === 'c1')?.rank).toBe(3);
        expect(result.find((r) => r.consultantId === 'c2')?.rank).toBe(1);
        expect(result.find((r) => r.consultantId === 'c3')?.rank).toBe(2);

    })
})