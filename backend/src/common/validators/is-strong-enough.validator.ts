import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as zxcvbn from 'zxcvbn';

@ValidatorConstraint({ name: 'isStrongEnough', async: false })
export class IsStrongEnoughConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    const result = zxcvbn(password);
    // Score 0 = very weak, 1 = weak, 2 = fair, 3 = strong, 4 = very strong
    // We require at least a 3
    return result.score >= 3;
  }

  defaultMessage(): string {
    return 'Oops. Your password is too weak. Avoid common words, names, sequences, predictable patterns and any personal.';
  }
}

export function IsStrongEnough(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongEnoughConstraint,
    });
  };
}