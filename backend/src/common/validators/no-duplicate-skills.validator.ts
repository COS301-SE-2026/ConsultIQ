import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'noDuplicateSkills', async: false })
export class NoDuplicateSkillsConstraint implements ValidatorConstraintInterface {
    validate(skills: { name?: string }[], _arg: ValidationArguments): boolean {
        if(!Array.isArray(skills))
        {
            return true;
        }

        const seen = new Set<string>();
        for (const skill of skills){
            const normalised = skill?.name?.trim().toLowerCase();
            if (!normalised)
            {
                continue;
            }

            if (seen.has(normalised))
            {
                return false;
            }
        }
        return false;
    }

    defaultMessage(_args: ValidationArguments): string {
        return 'Duplicate skills are not allowed.';
    }
}

export function NoDuplicateSkills(validationOptions?: ValidationOptions){
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [],
            validator: NoDuplicateSkillsConstraint,
        });
    };
}