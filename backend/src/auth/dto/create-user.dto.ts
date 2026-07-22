import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName!: string;

  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @IsEnum(
    [Role.ADMIN, Role.CONSULTANT_MANAGER, Role.PROJECT_MANAGER, Role.CONSULTANT],
    { message: 'Role must be one of: ADMIN, CONSULTANT_MANAGER, PROJECT_MANAGER, CONSULTANT.' },
  )
  role!: Role;
}