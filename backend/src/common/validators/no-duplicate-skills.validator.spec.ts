// src/common/validators/no-duplicate-skills.validator.spec.ts
import { ValidationArguments } from 'class-validator';
import { NoDuplicateSkillsConstraint } from './no-duplicate-skills.validator';

describe('NoDuplicateSkillsConstraint', () => {
  const constraint = new NoDuplicateSkillsConstraint();

  const makeArgs = (): ValidationArguments => ({
    object: {},
    property: 'skills',
    value: undefined,
    constraints: [],
    targetName: 'CreateProjectDto',
  });

  it('returns true when skills is not an array', () => {
    expect(constraint.validate(undefined as any, makeArgs())).toBe(true);
  });

  it('returns true for an empty array', () => {
    expect(constraint.validate([], makeArgs())).toBe(true);
  });

  it('returns true when all skill names are distinct', () => {
    const skills = [{ name: 'AWS' }, { name: 'Docker' }, { name: 'React' }];
    expect(constraint.validate(skills, makeArgs())).toBe(true);
  });

  it('returns false when the same skill name is repeated exactly', () => {
    const skills = [{ name: 'AWS' }, { name: 'AWS' }];
    expect(constraint.validate(skills, makeArgs())).toBe(false);
  });

  it('returns false when duplicate skill names differ only in casing', () => {
    const skills = [{ name: 'AWS' }, { name: 'aws' }];
    expect(constraint.validate(skills, makeArgs())).toBe(false);
  });

  it('returns false when duplicate skill names differ only in surrounding whitespace', () => {
    const skills = [{ name: '  AWS  ' }, { name: 'AWS' }];
    expect(constraint.validate(skills, makeArgs())).toBe(false);
  });

  it('ignores entries with a missing or empty name when checking for duplicates', () => {
    const skills = [{ name: '' }, { name: undefined }, { name: 'AWS' }];
    expect(constraint.validate(skills as any, makeArgs())).toBe(true);
  });

  it('defaultMessage explains that skill names are case-insensitive', () => {
    expect(constraint.defaultMessage(makeArgs())).toContain('case-insensitive');
  });
});