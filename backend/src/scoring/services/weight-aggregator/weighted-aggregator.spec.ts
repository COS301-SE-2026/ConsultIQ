import { WeightedAggregator, ScoredConsultant } from "./weighted-aggregator";
import { ScoringFactor } from "../../enums/scoring-factor.enum";

const WEIGHTS: Partial<Record<ScoringFactor, number>> = {
    [ScoringFactor.SKILL_ALIGNMENT]: 0.4,
    [ScoringFactor.COMPETENCY_LEVEL]: 0.3,
    [ScoringFactor.AVAILABILITY]: 0.15,
    [ScoringFactor.COST_TO_COMPANY]: 0.1,
    [ScoringFactor.LOCATION]: 0.05,

}


describe('WeightedAggregator', () => {
    let aggregator: WeightedAggregator;

    beforeEach(() => {
        aggregator = new WeightedAggregator();
    })

    it('calcuates the weighted score as the weighted sum of factor scores', () => {

        const consultant: ScoredConsultant = {
            consultantId: 'consultant-01',
            consultantName: 'Lethabo',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 1,
                [ScoringFactor.COMPETENCY_LEVEL]: 1,
                [ScoringFactor.AVAILABILITY]: 1,
                [ScoringFactor.COST_TO_COMPANY]: 1,
                [ScoringFactor.LOCATION]: 1,
            },
            weights: WEIGHTS,
        };

        const [result] = aggregator.aggregate([consultant]);
        expect(result.finalScore).toBe(100);
    })

    it('partial weighted sum calculated correctly', () => {

        const consultant: ScoredConsultant = {
            consultantId: 'consultant-01',
            consultantName: 'Kutlwano',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
                [ScoringFactor.COMPETENCY_LEVEL]: 0.5,
                [ScoringFactor.AVAILABILITY]: 1,
                [ScoringFactor.COST_TO_COMPANY]: 0,
                [ScoringFactor.LOCATION]: 0.6,
            },
            weights: WEIGHTS,
        };

        const [result] = aggregator.aggregate([consultant]);
        expect(result.finalScore).toBe(63);
    })

    it('returned ranked list of consultants', () => {

        const c1: ScoredConsultant = {
            consultantId: 'c1',
            consultantName: 'Benjamin',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
            },
            weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.2, },
        };

        const c2: ScoredConsultant = {
            consultantId: 'c2',
            consultantName: 'Bruce',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
            },
            weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.9, },
        };

        const c3: ScoredConsultant = {
            consultantId: 'c3',
            consultantName: 'Lethabo',
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
            consultantName: 'Brook',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
            },
            weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.2, },
        };

        const c2: ScoredConsultant = {
            consultantId: 'c2',
            consultantName: 'Chopper',
            factorScores: {
                [ScoringFactor.SKILL_ALIGNMENT]: 0.75,
            },
            weights: { [ScoringFactor.SKILL_ALIGNMENT]: 0.9, },
        };

        const c3: ScoredConsultant = {
            consultantId: 'c3',
            consultantName: 'Luffy',
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