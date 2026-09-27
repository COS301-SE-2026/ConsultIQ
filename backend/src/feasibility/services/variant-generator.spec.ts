import { CompetencyLevel } from '@prisma/client';
import { VariantGenerator } from './variant-generator';
import { FeasibilityCheckRequestDto } from '../dto/feasibility-check-request.dto';

describe('VariantGenerator', () => {
  let generator: VariantGenerator;

  const baseSpec = (): FeasibilityCheckRequestDto =>
    ({
      startDate: '2026-10-01',
      endDate: '2026-12-01',
      teamSize: 2,
      allocation: 100,
      budget: 100000,
      city: 'Johannesburg',
      province: 'Gauteng',
      latitude: -26.2041,
      longitude: 28.0473,
      skills: [
        { name: 'React', competency: 'INTERMEDIATE', years: 3, mandatory: true },
        { name: 'AWS', competency: 'EXPERT', years: 5, mandatory: true },
      ],
    }) as FeasibilityCheckRequestDto;

  beforeEach(() => {
    generator = new VariantGenerator();
  });

  describe('budget variant', () => {
    it('increases budget by 15%, rounded', () => {
      const variants = generator.generate(baseSpec());
      const budgetVariant = variants.find((v) => v.label.startsWith('Budget'));

      expect(budgetVariant).toBeDefined();
      expect(budgetVariant!.spec.budget).toBe(115000);
    });

    it('does not mutate any other field on the budget variant', () => {
      const spec = baseSpec();
      const variants = generator.generate(spec);
      const budgetVariant = variants.find((v) => v.label.startsWith('Budget'))!;

      expect(budgetVariant.spec.skills).toEqual(spec.skills);
      expect(budgetVariant.spec.teamSize).toBe(spec.teamSize);
    });

    it('does not mutate the original spec object', () => {
      const spec = baseSpec();
      const originalBudget = spec.budget;
      generator.generate(spec);

      expect(spec.budget).toBe(originalBudget);
    });
  });

  describe('competency variant', () => {
    it('lowers every skill one level when none are at the floor', () => {
      const variants = generator.generate(baseSpec());
      const competencyVariant = variants.find((v) =>
        v.label.includes('competency'),
      );

      expect(competencyVariant).toBeDefined();
      expect(competencyVariant!.spec.skills).toEqual([
        expect.objectContaining({ name: 'React', competency: CompetencyLevel.BEGINNER }),
        expect.objectContaining({ name: 'AWS', competency: CompetencyLevel.INTERMEDIATE }),
      ]);
    });

    it('leaves a skill already at BEGINNER untouched while lowering others', () => {
      const spec = baseSpec();
      spec.skills = [
        { name: 'React', competency: 'BEGINNER', years: 1, mandatory: true },
        { name: 'AWS', competency: 'EXPERT', years: 5, mandatory: true },
      ];

      const variants = generator.generate(spec);
      const competencyVariant = variants.find((v) => v.label.includes('competency'))!;

      expect(competencyVariant.spec.skills).toEqual([
        expect.objectContaining({ name: 'React', competency: CompetencyLevel.BEGINNER }),
        expect.objectContaining({ name: 'AWS', competency: CompetencyLevel.INTERMEDIATE }),
      ]);
    });

    it('omits the variant entirely when every skill is already at BEGINNER', () => {
      const spec = baseSpec();
      spec.skills = [
        { name: 'React', competency: 'BEGINNER', years: 1, mandatory: true },
        { name: 'AWS', competency: 'BEGINNER', years: 1, mandatory: true },
      ];

      const variants = generator.generate(spec);
      const competencyVariant = variants.find((v) => v.label.includes('competency'));

      expect(competencyVariant).toBeUndefined();
    });

    it('treats an unrecognized competency string as already-floor (leaves it untouched, does not throw)', () => {
      const spec = baseSpec();
      spec.skills = [
        { name: 'React', competency: 'NONSENSE', years: 1, mandatory: true },
        { name: 'AWS', competency: 'EXPERT', years: 5, mandatory: true },
      ];

      expect(() => generator.generate(spec)).not.toThrow();
      const competencyVariant = generator
        .generate(spec)
        .find((v) => v.label.includes('competency'))!;

      expect(competencyVariant.spec.skills[0].competency).toBe('NONSENSE');
      expect(competencyVariant.spec.skills[1].competency).toBe(CompetencyLevel.INTERMEDIATE);
    });

    it('does not mutate the original skills array', () => {
      const spec = baseSpec();
      const originalSkills = JSON.parse(JSON.stringify(spec.skills));
      generator.generate(spec);

      expect(spec.skills).toEqual(originalSkills);
    });
  });

  describe('generate', () => {
    it('returns both variants when both are applicable', () => {
      const variants = generator.generate(baseSpec());
      expect(variants).toHaveLength(2);
    });

    it('returns only the budget variant when the competency variant is inapplicable', () => {
      const spec = baseSpec();
      spec.skills = [{ name: 'React', competency: 'BEGINNER', years: 1, mandatory: true }];

      const variants = generator.generate(spec);
      expect(variants).toHaveLength(1);
      expect(variants[0].label).toContain('Budget');
    });

    it('handles an empty skills array without throwing', () => {
      const spec = baseSpec();
      spec.skills = [];

      expect(() => generator.generate(spec)).not.toThrow();
      const variants = generator.generate(spec);
      expect(variants.find((v) => v.label.includes('competency'))).toBeUndefined();
    });
  });
});