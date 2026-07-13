import {
    Body, 
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    Put,
    Req,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { AdminService } from '../../admin/services/admin.service';
import { AssignRoleDto } from '../../admin/dto/assign-role.dto';
import { Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Put('users/:userId/role')
    @HttpCode(HttpStatus.OK)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @UsePipes(new ValidationPipe({ whitelist: true}))
    async assignRole(
        @Param('userId') targetUserId: string,
        @Body() assignRoleDto: AssignRoleDto,
        @Req() req: any,
    ): Promise<{ message: string }> {
        const performedById = req.user.userId as string;
        return await this.adminService.assignRole(targetUserId, assignRoleDto, performedById);
    }
}
