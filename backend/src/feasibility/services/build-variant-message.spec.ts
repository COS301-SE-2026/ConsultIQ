import { CompetencyLevel } from '@prisma/client';
import { buildVariantMessage } from './build-variant-message';
import { FeasibilityVariant } from '../interfaces/feasibility-variant.interface';

describe('buildVariantMessage', () => {
  const budgetVariant: FeasibilityVariant = { kind: 'budget', label: 'Budget +15%', spec: {} as any };
  const competencyVariant: FeasibilityVariant = {
    kind: 'competency',
    label: 'Lower React',
    spec: {} as any,
    skillName: 'React',
    fromLevel: CompetencyLevel.EXPERT,
    toLevel: CompetencyLevel.INTERMEDIATE,
  };

  it('describes a positive delta for a budget variant', () => {
    const message = buildVariantMessage({ eligibleCount: 5, topScore: 70 }, budgetVariant, { eligibleCount: 10, topScore: 80 });
    expect(message).toBe('5 more consultants would qualify if the budget were increased by 15%.');
  });

  it('uses singular "consultant" for a delta of exactly one', () => {
    const message = buildVariantMessage({ eligibleCount: 5, topScore: 70 }, budgetVariant, { eligibleCount: 6, topScore: 80 });
    expect(message).toBe('1 more consultant would qualify if the budget were increased by 15%.');
  });

  it('reports no additional consultants when the delta is zero', () => {
    const message = buildVariantMessage({ eligibleCount: 5, topScore: 70 }, budgetVariant, { eligibleCount: 5, topScore: 70 });
    expect(message).toBe('No additional consultants would qualify if the budget were increased by 15%.');
  });

  it('describes a competency variant with the skill name and both levels', () => {
    const message = buildVariantMessage({ eligibleCount: 2, topScore: 60 }, competencyVariant, { eligibleCount: 5, topScore: 75 });
    expect(message).toBe("3 more consultants would qualify if React's required level were lowered from Expert to Intermediate.");
  });
});