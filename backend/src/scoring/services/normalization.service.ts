import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Pure normalization math used across the fit score engine.
 */
@Injectable()
export class NormalizationService {

    // Min-Max scales (0.0-1.0)
    //Formular: (Value - min)/ (max-min)

    // out of range inputs are clamped rather(capped to max or min value)

    scaleValue(value: number, min: number, max: number): number {
        if (max <= min) {
            throw new BadRequestException('Min number must not be greater or equal max.')
        }

        const clamped = Math.max(min, Math.min(max, value));
        return (clamped - min) / (max - min);

    }

    /**
     * Normalizes a set of weights to 1.0
     *
     */

    normalizeWeights(weights: Record<string, number>): Record<string, number> {
        const entries = Object.entries(weights);

        if (entries.length === 0) {
            throw new BadRequestException('Cannot normalize an empty set of weights');

        }

        const total = entries.reduce((sum, [, w]) => sum + w, 0);



        if (total <= 0) {
            throw new BadRequestException('Sum of all weights must be greater than zero');
        }

        const decimalPoint = 10000;


        const normalized: Record<string, number> = {};
        let totalSum = 0;
        entries.forEach(([key, value], index) => {

            if (index === entries.length - 1) {
                normalized[key] = Math.round((1 - totalSum) * decimalPoint) / decimalPoint;
            } else {
                const share = Math.round((value / total) * decimalPoint) * decimalPoint;
                normalized[key] = share;
                totalSum += share;

            }

        });

        return normalized;

    }


}