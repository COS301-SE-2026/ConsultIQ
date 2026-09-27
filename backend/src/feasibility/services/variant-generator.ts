import { Injectable } from '@nestjs/common';
import { CompetencyLevel } from '@prisma/client';
import { FeasibilityCheckRequestDto } from '../dto/feasibility-check-request.dto';

export interface FeasibilityVariant {
  label: string;
  spec: FeasibilityCheckRequestDto;
}

/**
 * "one level down" is a simple index lookup rather than guessed arithmetic.
 */
const COMPETENCY_ORDER: CompetencyLevel[] = [
  CompetencyLevel.BEGINNER,
  CompetencyLevel.INTERMEDIATE,
  CompetencyLevel.EXPERT,
];

const BUDGET_INCREASE_FACTOR = 1.15;

/**
 * Produces the fixed, server-side set of "what if" variants for a
 * feasibility check. Each variant changes exactly ONE attribute from
 * the base spec. Variants that wouldn't produce a
 * meaningful change (e.g. every skill already at the lowest
 * competency level) are omitted rather than returned as a no-op.
 */
@Injectable()
export class VariantGenerator {
  generate(baseSpec: FeasibilityCheckRequestDto): FeasibilityVariant[] {
    const variants: FeasibilityVariant[] = [];

    const budgetVariant = this.buildBudgetVariant(baseSpec);
    if (budgetVariant) variants.push(budgetVariant);

    const competencyVariant = this.buildCompetencyVariant(baseSpec);
    if (competencyVariant) variants.push(competencyVariant);

    return variants;
  }

  private buildBudgetVariant(
    baseSpec: FeasibilityCheckRequestDto,
  ): FeasibilityVariant | null {
    return {
      label: `Budget +${Math.round((BUDGET_INCREASE_FACTOR - 1) * 100)}%`,
      spec: {
        ...baseSpec,
        budget: Math.round(baseSpec.budget * BUDGET_INCREASE_FACTOR),
      },
    };
  }

  private buildCompetencyVariant(
    baseSpec: FeasibilityCheckRequestDto,
  ): FeasibilityVariant | null {
    let anySkillLowered = false;

    const relaxedSkills = baseSpec.skills.map((skill) => {
      const currentLevel = skill.competency.toUpperCase() as CompetencyLevel;
      const currentIndex = COMPETENCY_ORDER.indexOf(currentLevel);

      // Unknown/invalid competency strings are left untouched here —
      // FeasibilityService's own validation is what rejects bad input;
      // this method only lowers levels it can confidently place in the
      // ordering.
      if (currentIndex <= 0) {
        return skill; // already at floor (or unrecognized) — no change
      }

      anySkillLowered = true;
      return {
        ...skill,
        competency: COMPETENCY_ORDER[currentIndex - 1],
      };
    });

    if (!anySkillLowered) {
      return null; // every skill already at floor — omit per AC4
    }

    return {
      label: 'Minimum competency −1 level',
      spec: { ...baseSpec, skills: relaxedSkills },
    };
  }
}