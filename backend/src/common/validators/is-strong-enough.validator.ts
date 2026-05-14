import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import zxcvbn = require('zxcvbn');

@ValidatorConstraint({ name: 'isStrongEnough', async: false })
export class IsStrongEnoughConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments): boolean {
    const object = args.object as any;

    // Build a list of user inputs to check against
    // zxcvbn will penalise the score if the password contains any of these
    const userInputs: string[] = [];

    if (object.email) {
      // Add the full email and just the local part (before the @)
      userInputs.push(object.email);
      userInputs.push(object.email.split('@')[0]);
    }

    if (object.fullName) {
      // Add the full name and each individual word in the name
      userInputs.push(object.fullName);
      userInputs.push(...object.fullName.split(' '));
    }

    const result = zxcvbn(password, userInputs);
    // Score 0 = very weak, 1 = weak, 2 = fair, 3 = strong, 4 = very strong
    // We require at least a 3
    return result.score >= 3;
  }

  defaultMessage(): string {
    return 'Oops. Your password is too weak. Avoid using common words, names, sequences, predictable patterns or personal information.';
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