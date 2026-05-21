import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

function isValidSAID(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;

  // Validate date of birth embedded in the ID
  const month = parseInt(id.substring(2, 4));
  const day = parseInt(id.substring(4, 6));
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Luhn algorithm check
  let sum = 0;
  let isEven = false;

  for (let i = id.length - 1; i >= 0; i--) {
    let digit = parseInt(id[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

@ValidatorConstraint({ name: 'isSAIdentityNumber', async: false })
export class IsSAIdentityNumberConstraint
  implements ValidatorConstraintInterface
{
  validate(id: string): boolean {
    return isValidSAID(id);
  }

  defaultMessage(): string {
    return 'ID number is not a valid South African identity number.';
  }
}

export function IsSAIdentityNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSAIdentityNumberConstraint,
    });
  };
}