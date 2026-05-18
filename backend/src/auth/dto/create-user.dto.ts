import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName: string;

  @IsEmail({}, { message: 'A valid email address is required.' })
  email: string;

  @IsEnum(Role, { message: 'Role must be a valid system role.' })
  role: Role;
}