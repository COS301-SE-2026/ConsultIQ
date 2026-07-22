import { IsEnum } from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

export class AssignRoleDto {
    @IsEnum(
        [
         Role.ADMIN,
         Role.CONSULTANT_MANAGER,
         Role.PROJECT_MANAGER,
         Role.CONSULTANT,
         ],
         {
            message:
                  'Role must be one of: ADMIN, CONSULTANT_MANAGER, PROJECT_MANAGER, CONSULTANT. The SUPER_ADMIN role cannot be assigned through the API.',
         },
     )
     role!: Role;
}