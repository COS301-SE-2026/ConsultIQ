import {
  FeasibilityVariantMetadata,
} from '../interfaces/feasibility-variant.interface';
import { FeasibilityCheckResult } from '../interfaces/feasibility-result.interface';
import { formatCompetencyLevel } from './format-competency-level';


function buildCountPhrase(delta: number): string {
  if (delta <= 0) {
    return 'No additional consultants would qualify';
  }

  const consultantWord = delta === 1 ? 'consultant' : 'consultants';
  return `${delta} more ${consultantWord} would qualify`;
}

export function buildVariantMessage(
  sanitizedBase: FeasibilityCheckResult,
  variant: FeasibilityVariantMetadata,
  sanitizedVariant: FeasibilityCheckResult,
): string {
  const delta = sanitizedVariant.eligibleCount - sanitizedBase.eligibleCount;
  const countPhrase = buildCountPhrase(delta);
   
  if (variant.kind === 'budget') {
    return `${countPhrase} if the budget were increased by 15%.`;
  }

  const fromLabel = formatCompetencyLevel(variant.fromLevel!);
  const toLabel = formatCompetencyLevel(variant.toLevel!);
  return `${countPhrase} if ${variant.skillName}'s required level were lowered from ${fromLabel} to ${toLabel}.`;
}
