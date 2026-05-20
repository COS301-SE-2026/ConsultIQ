import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import zxcvbn from 'zxcvbn';

interface UserInputObject {
  email?: string;
  fullName?: string;
}

@ValidatorConstraint({ name: 'isStrongEnough', async: false })
export class IsStrongEnoughConstraint implements ValidatorConstraintInterface {
validate(password: string, args: ValidationArguments): boolean {
    const object = args.object as UserInputObject;
    const userInputs: string[] = [];
    const passwordLower = password.toLowerCase();

    if (object.email) {
      const localPart = object.email.split('@')[0];
      userInputs.push(object.email, localPart);
      // Check if password contains any substring of the local part longer than 4 chars
      for (let i = 0; i <= localPart.length - 5; i++) {
        for (let j = i + 5; j <= localPart.length; j++) {
          const substring = localPart.slice(i, j).toLowerCase();
          if (passwordLower.includes(substring)) return false;
        }
      }
    }

    if (object.fullName) {
      const nameParts = object.fullName.split(' ');
      userInputs.push(object.fullName, ...nameParts);
      // Explicit check — reject if password contains any part of the name
      for (const part of nameParts) {
        if (part.length > 2 && passwordLower.includes(part.toLowerCase())) return false;
      }
    }

    const result = zxcvbn(password, userInputs);
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