import { FeasibilityVariant, FeasibilityVariantMetadata } from '../interfaces/feasibility-variant.interface';
import { FeasibilityCheckResult } from '../interfaces/feasibility-result.interface';
import { formatCompetencyLevel } from './format-competency-level';

export function buildVariantMessage(
  sanitizedBase: FeasibilityCheckResult,
  variant: FeasibilityVariantMetadata,
  sanitizedVariant: FeasibilityCheckResult,
): string {
  const delta = sanitizedVariant.eligibleCount - sanitizedBase.eligibleCount;
  const countPhrase =
    delta > 0
      ? `${delta} more consultant${delta === 1 ? '' : 's'} would qualify`
      : `No additional consultants would qualify`;

  if (variant.kind === 'budget') {
    return `${countPhrase} if the budget were increased by 15%.`;
  }

  const fromLabel = formatCompetencyLevel(variant.fromLevel!);
  const toLabel = formatCompetencyLevel(variant.toLevel!);
  return `${countPhrase} if ${variant.skillName}'s required level were lowered from ${fromLabel} to ${toLabel}.`;
}