import { CompetencyLevel } from '@prisma/client';
import { VariantGenerator } from './variant-generator';
import { FeasibilityCheckRequestDto } from '../dto/feasibility-check-request.dto';

describe('VariantGenerator', () => {
  let generator: VariantGenerator;

  const baseSpec = (): FeasibilityCheckRequestDto =>
    ({
      startDate: '2026-10-01', endDate: '2026-12-01', teamSize: 2, allocation: 100,
      budget: 100000, city: 'Johannesburg', province: 'Gauteng', latitude: -26.2041, longitude: 28.0473,
      skills: [
        { name: 'React', competency: 'INTERMEDIATE', years: 3, mandatory: true },
        { name: 'AWS', competency: 'EXPERT', years: 5, mandatory: true },
      ],
    }) as FeasibilityCheckRequestDto;

  beforeEach(() => { generator = new VariantGenerator(); });

  describe('budget variant', () => {
    it('increases budget by 15%, rounded', () => {
      const v = generator.generate(baseSpec()).find((v) => v.kind === 'budget')!;
      expect(v.spec.budget).toBe(115000);
    });
  });

  describe('per-skill competency variants', () => {
    it('produces one variant per skill not already at the floor', () => {
      const variants = generator.generate(baseSpec()).filter((v) => v.kind === 'competency');
      expect(variants).toHaveLength(2);
    });

    it('never combines multiple skills into a single variant', () => {
      const base = baseSpec();
      const variants = generator.generate(base).filter((v) => v.kind === 'competency');
      for (const v of variants) {
        const changed = v.spec.skills.filter((s, i) => s.competency !== base.skills[i].competency);
        expect(changed).toHaveLength(1);
      }
    });

    it('lowers by exactly one level and records from/to', () => {
      const v = generator.generate(baseSpec()).find((v) => v.kind === 'competency' && v.skillName === 'AWS')!;
      expect(v.fromLevel).toBe(CompetencyLevel.EXPERT);
      expect(v.toLevel).toBe(CompetencyLevel.INTERMEDIATE);
    });

    it('skips a skill already at BEGINNER, but still produces variants for the others', () => {
      const spec = baseSpec();
      spec.skills = [
        { name: 'React', competency: 'BEGINNER', years: 1, mandatory: true },
        { name: 'AWS', competency: 'EXPERT', years: 5, mandatory: true },
      ];
      const variants = generator.generate(spec).filter((v) => v.kind === 'competency');
      expect(variants).toHaveLength(1);
      expect(variants[0].skillName).toBe('AWS');
    });

    it('produces no competency variants when every skill is at BEGINNER', () => {
      const spec = baseSpec();
      spec.skills = [
        { name: 'React', competency: 'BEGINNER', years: 1, mandatory: true },
        { name: 'AWS', competency: 'BEGINNER', years: 1, mandatory: true },
      ];
      expect(generator.generate(spec).filter((v) => v.kind === 'competency')).toEqual([]);
    });

    it('skips an unrecognised competency string without throwing', () => {
      const spec = baseSpec();
      spec.skills = [
        { name: 'React', competency: 'NONSENSE', years: 1, mandatory: true },
        { name: 'AWS', competency: 'EXPERT', years: 5, mandatory: true },
      ];
      expect(() => generator.generate(spec)).not.toThrow();
      const variants = generator.generate(spec).filter((v) => v.kind === 'competency');
      expect(variants).toHaveLength(1);
    });
  });

  describe('generate', () => {
    it('returns budget plus one variant per eligible skill', () => {
      expect(generator.generate(baseSpec())).toHaveLength(3);
    });

    it('returns only the budget variant when no skill can be lowered', () => {
      const spec = baseSpec();
      spec.skills = [{ name: 'React', competency: 'BEGINNER', years: 1, mandatory: true }];
      expect(generator.generate(spec)).toHaveLength(1);
    });
  });
});