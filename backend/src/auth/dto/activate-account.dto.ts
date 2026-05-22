import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { IsStrongEnough } from '../../common/validators/is-strong-enough.validator';

export class ActivateAccountDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Activation token is required.' })
  token: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.',
    },
  )
  @IsStrongEnough()
  password: string;
}
