import { FeasibilityCheckResult } from './feasibility-result.interface';
import { FeasibilityVariantKind } from './feasibility-variant.interface';
import { CompetencyLevel } from '@prisma/client';

export interface FeasibilityVariantResult extends FeasibilityCheckResult {
  label: string;
  kind: FeasibilityVariantKind;
  skillName?: string;
  fromLevel?: CompetencyLevel;
  toLevel?: CompetencyLevel;
  message?: string;
}

export interface FeasibilityCheckResponse extends FeasibilityCheckResult {
  variants: FeasibilityVariantResult[];
}