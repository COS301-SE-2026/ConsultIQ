import { Controller, Delete, Patch } from "@nestjs/common";
import { AdminUserService } from "src/admin/users/services/admin.user.service";
import { Role } from '../../auth/enums/role.enum';
import { Roles } from "src/common/guards/roles.guard";
import { Get, Param } from "@nestjs/common";


@Controller('admin')
export class AdminController {
    constructor(private readonly adminUserService: AdminUserService) { }

    @Get('users')
    @Roles(Role.ADMIN)
    async getAllUsers(@Param('page') page: number = 1, @Param('limit') limit: number = 10) {
        return await this.adminUserService.getAllUsers(page, limit);
    }

    @Delete('users/:userId')
    @Roles(Role.ADMIN)
    async deleteUser(@Param('userId') userId: string) {
        return await this.adminUserService.deleteUser(userId);
    }

    @Patch('users/:userId/activate')
    @Roles(Role.ADMIN)
    async activateUser(@Param('userId') userId: string) {
        return await this.adminUserService.activeUser(userId);
    }

    @Patch('users/:userId/suspend')
    @Roles(Role.ADMIN)
    async suspendUser(@Param('userId') userId: string) {
        return await this.adminUserService.suspendUser(userId);
    }



}