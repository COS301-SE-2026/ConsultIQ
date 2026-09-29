import { Injectable } from '@nestjs/common';
import { CompetencyLevel } from '@prisma/client';
import { FeasibilityCheckRequestDto } from '../dto/feasibility-check-request.dto';
import { FeasibilityVariant } from '../interfaces/feasibility-variant.interface';


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
 return [
      this.buildBudgetVariant(baseSpec),
      ...this.buildCompetencyVariants(baseSpec),
    ];
  }

  private buildBudgetVariant(
    baseSpec: FeasibilityCheckRequestDto,
  ): FeasibilityVariant {
    return {
      kind: 'budget',
      label: `Budget +${Math.round((BUDGET_INCREASE_FACTOR - 1) * 100)}%`,
      spec: {
        ...baseSpec,
        budget: Math.round(baseSpec.budget * BUDGET_INCREASE_FACTOR),
      },
    };
  }

  private buildCompetencyVariants(
    baseSpec: FeasibilityCheckRequestDto,
  ): FeasibilityVariant[] {
    const variants: FeasibilityVariant[] = [];

    baseSpec.skills.forEach((skill, index) => {
      const currentLevel = skill.competency.toUpperCase() as CompetencyLevel;
      const currentIndex = COMPETENCY_ORDER.indexOf(currentLevel);

      // Already at floor, or unrecognised — skip rather than guess.
      if (currentIndex <= 0) return;

      const targetLevel = COMPETENCY_ORDER[currentIndex - 1];
      const relaxedSkills = baseSpec.skills.map((s, i) =>
        i === index ? { ...s, competency: targetLevel } : s,
      );

      variants.push({
        kind: 'competency',
        skillName: skill.name,
        fromLevel: currentLevel,
        toLevel: targetLevel,
        label: `Lower ${skill.name} to ${targetLevel}`,
        spec: { ...baseSpec, skills: relaxedSkills },
      });
    });

    return variants;
  }
}