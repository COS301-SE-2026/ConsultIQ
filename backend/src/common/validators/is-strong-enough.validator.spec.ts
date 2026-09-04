import { ValidationArguments } from 'class-validator';
import { IsStrongEnoughConstraint } from './is-strong-enough.validator';

describe('IsStrongEnoughConstraint', () => {
  const constraint = new IsStrongEnoughConstraint();

  const makeArgs = (object: Record<string, unknown>): ValidationArguments => ({
    object, property: 'password', value: undefined, constraints: [],targetName: 'RegisterDto',});

  it('returns true when password is an empty string', () => {
    expect(constraint.validate('', makeArgs({}))).toBe(true);
  });

  it('returns true when password is not a string', () => {
    expect(constraint.validate(undefined as unknown as string, makeArgs({})),).toBe(true);
  });

  it('returns false when password contains a substring of the email local part', () => {
    const args = makeArgs({ email: 'johnsmith@example.com' });
    expect(constraint.validate('johnsmith123', args)).toBe(false);
  });

  it('returns false when password contains part of the full name', () => {
    const args = makeArgs({ fullName: 'Carol Botho' });
    expect(constraint.validate('smithy1234', args)).toBe(false);
  });

  it('returns true for a strong password with no personal info', () => {
    const args = makeArgs({
      email: 'johnsmith@example.com', fullName: 'Carol Botho'});
    expect(constraint.validate('Xk9#mQ2!pLw7', args)).toBe(true);
  });

  it('defaultMessage returns the expected warning', () => {
    expect(constraint.defaultMessage()).toContain('too weak');
  });
});