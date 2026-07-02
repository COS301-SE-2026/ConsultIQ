import {
  Controller,
  Delete,
  Patch,
  Get,
  Param,
  Request,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { AdminUserService } from '../../admin/users/services/admin.user.service';
import { Role } from '../../auth/enums/role.enum';
import { Roles } from '../../common/guards/roles.guard';
import { AdminProjectService } from '../../admin/projects/services/admin.projects.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly adminProjectService: AdminProjectService,
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
}
