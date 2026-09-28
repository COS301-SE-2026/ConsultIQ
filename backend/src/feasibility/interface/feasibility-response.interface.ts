import { FeasibilityCheckResult } from './feasibility-result.interface';

export interface FeasibilityVariantResult extends FeasibilityCheckResult {
  label: string;
}

export interface FeasibilityCheckResponse extends FeasibilityCheckResult {
  variants: FeasibilityVariantResult[];
}