import { NormalizationService } from "./normalization.service";

describe('NormalizationService', () => {
    let service: NormalizationService;

    beforeEach(() => {
        service = new NormalizationService();
    });

    describe('scaleValue Function ', () => {
        it('scales a mid-range value to its correct proportion', () => {
            expect(service.scaleValue(5, 0, 10)).toBe(0.5)
        })


        it('min boundry test to 0.0', () => {
            expect(service.scaleValue(0, 0, 10)).toBe(0.0)
        })

        it('max boundry test to 1.0', () => {
            expect(service.scaleValue(10, 0, 10)).toBe(1.0)
        })

        it('negative testing to 0.0', () => {
            expect(service.scaleValue(-5, 0, 10)).toBe(0.0)
        })

        it('out of max boundry test greater than 10, 1.0', () => {
            expect(service.scaleValue(50, 0, 10)).toBe(1.0)
        })
        it('negative ranges', () => {
            expect(service.scaleValue(-5, -10, 0)).toBe(0.5)
        })

        it('throws exception when min is greater than max', () => {
            expect(() => service.scaleValue(5, 10, 0)).toThrow(Error);
        });



    })

    describe('normalizeWeights function', () => {
        it('normalizes weights to sum to 1.0', () => {
            const result = service.normalizeWeights({
                skillAlignment: 40,
                competencyMatch: 30,
                availability: 15,
                costFit: 10,
                geographicFit: 5,
            })
            expect(result.skillAlignment).toBe(0.4);
            expect(result.competencyMatch).toBe(0.3);
            expect(result.availability).toBe(0.15);
            expect(result.costFit).toBe(0.1);
            expect(result.geographicFit).toBe(0.05);

        })


        it('weights must sum up  to 1.0', () => {
            const result = service.normalizeWeights({ a: 1, b: 2, c: 1 });
            const sum = Object.values(result).reduce((acc, v) => acc + v, 0);
            expect(sum).toBe(1);
        })

        it('throws exception when the weights object is empty', () => {
            expect(() => service.normalizeWeights({})).toThrow(Error);
        });
        it('division by zero', () => {
            expect(() => service.normalizeWeights({ a: 0, b: 0, c: 0 }),
            ).toThrow(Error);
        });
    })
})