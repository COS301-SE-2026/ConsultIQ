import {
  Body,
  Put,
  Req,
  UsePipes,
  ValidationPipe
  Controller,
  Delete,
  Patch,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Request,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { AdminUserService } from '../../admin/users/services/admin.user.service';
import { Role } from '../../auth/enums/role.enum';
import { Roles } from '../../common/guards/roles.guard';
import { AdminProjectService } from '../../admin/projects/services/admin.projects.service';
import { AdminService } from '../../admin/services/admin.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly adminProjectService: AdminProjectService,
    private readonly adminService: AdminService,
  ) {}

  // User management endpoints
  @Get('users')
  @Roles(Role.ADMIN)
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
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
    return await this.adminUserService.activateUser(userId);
  }

  @Patch('users/:userId/suspend')
  @Roles(Role.ADMIN)
  async suspendUser(@Param('userId') userId: string) {
    return await this.adminUserService.suspendUser(userId);
  }

  // Project Management Endpoints
  @Get('projects')
  @Roles(Role.ADMIN)
  async getAllProjects(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return await this.adminProjectService.getAllProjects(page, limit);
  }

  @Patch('projects/:projectId/archive')
  @Roles(Role.ADMIN)
  async archiveProject(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      throw new UnauthorizedException('User ID not found in request');
    }
    return await this.adminProjectService.archiveProject(
      projectId,
      adminUserId,
    );
  }

  @Patch('projects/:projectId/unarchive')
  @Roles(Role.ADMIN)
  async unarchiveProject(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      throw new UnauthorizedException('User ID not found in request');
    }
    return await this.adminProjectService.unarchiveProject(
      projectId,
      adminUserId,
    );
  }

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
