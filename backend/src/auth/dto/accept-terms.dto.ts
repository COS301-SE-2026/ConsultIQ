import { IsEmail } from 'class-validator';

export class AcceptTermsDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  email: string;
}
