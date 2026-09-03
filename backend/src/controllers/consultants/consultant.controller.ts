import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
  Param,
  Patch,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConsultantService } from '../../consultants/services/consultant.service';
import { CreateConsultantDto } from '../../consultants/dto/create-consultant.dto';
import { UpdateConsultantDto } from '../../consultants/dto/update-consultant.dto';
import { Role } from '../../auth/enums/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
@Controller('consultants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultantController {
  constructor(private readonly consultantService: ConsultantService) {}

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.CONSULTANT_MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createProfile(
    @Body() dto: CreateConsultantDto,
    @Req() req: any,
  ): Promise<{ message: string; consultantId: string }> {
    const cmUserId = req.user.userId as string;
    return await this.consultantService.createConsultantProfile(cmUserId, dto);
  }

  @Get('pending-profiles')
  @Roles(Role.CONSULTANT_MANAGER)
  async getPendingProfiles() {
    return await this.consultantService.getPendingProfiles();
  }

  @Get()
  @Roles(Role.CONSULTANT_MANAGER, Role.ADMIN)
  async getAllConsultants(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Req() req: any,
  ) {
    const userRole = req.user?.role ?? 'PROJECT_MANAGER';
    return await this.consultantService.getAllConsultants(
      parseInt(page, 10),
      parseInt(limit, 10),
      userRole,
    );
  }

  @Get('assigned/project')
  @Roles(Role.CONSULTANT)
  @HttpCode(HttpStatus.OK)
  async getAssignedProjects(@Req() req: any) {
    const userId = req.user?.userId;
    return this.consultantService.getAssignedProjects(userId);
  }

  @Get('assigned/projects/:projectId')
  @Roles(Role.CONSULTANT)
  @HttpCode(HttpStatus.OK)
  async getAssignedProjectDetails(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.consultantService.getAssignedProjectDetails(userId, projectId);
  }

  @Get('project/:projectId')
  @Roles(Role.PROJECT_MANAGER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getConsultantsByProject(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const userRole = req.user?.role;
    if (!userRole) {
      throw new BadRequestException('Missing user role.');
    }
    return await this.consultantService.getConsultantsByProject(
      projectId,
      userRole,
    );
  }

  @Patch('project/:projectId/unassign/:consultantId')
  @Roles(Role.PROJECT_MANAGER, Role.ADMIN, Role.CONSULTANT_MANAGER)
  @HttpCode(HttpStatus.OK)
  async unassignConsultant(
    @Param('projectId') projectId: string,
    @Param('consultantId') consultantId: string,
  ) {
    return await this.consultantService.unassignConsultant(
      projectId,
      consultantId,
    );
  }

  @Get(':id')
  @Roles(Role.CONSULTANT_MANAGER, Role.PROJECT_MANAGER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getConsultantById(@Param('id') id: string) {
    return await this.consultantService.getConsultantById(id);
  }

  @Get('user/:userId')
  @Roles(Role.CONSULTANT_MANAGER, Role.PROJECT_MANAGER, Role.ADMIN, Role.CONSULTANT)
  getConsultantByUserId(@Param('userId') userId: string, @Req() req: any) {
    if (req.user?.role === Role.CONSULTANT && req.user.userId !== userId) {
      throw new ForbiddenException('Consultants can only view their own profile.');
    }
    return this.consultantService.getConsultantByUserId(userId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.CONSULTANT_MANAGER, Role.CONSULTANT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateConsultantProfile(
    @Param('id') consultantId: string,
    @Req() req: any,
    @Body() dto: UpdateConsultantDto,
  ): Promise<{ message: string }> {
    const { userId, role } = req.user;
    return await this.consultantService.updateConsultantProfile(
      consultantId,
      dto,
      role,
      userId,
    );
  }

  @Post(':id/picture')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.CONSULTANT, Role.CONSULTANT_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @Param('id') consultantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<{ pictureUrl: string; message: string }> {
    if (!file) {
      throw new BadRequestException('No file was uploaded.');
    }
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    return this.consultantService.uploadProfilePicture(
      consultantId,
      userId,
      userRole,
      file,
    );
  }
}
