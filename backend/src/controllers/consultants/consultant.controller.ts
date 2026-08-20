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
} from '@nestjs/common';
import { ConsultantService } from '../../consultants/services/consultant.service';
import { CreateConsultantDto } from '../../consultants/dto/create-consultant.dto';
import { UpdateConsultantDto } from '../../consultants/dto/update-consultant.dto';
import { Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
@Controller('consultants')
export class ConsultantController {
  constructor(private readonly consultantService: ConsultantService) { }

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
  @HttpCode(HttpStatus.OK)
  async getAssignedProjects(@Req() req: any) {
    const userId = req.user?.userId;
    return this.consultantService.getAssignedProjects(userId);
  }

  @Get('assigned/projects/:projectId')
  @HttpCode(HttpStatus.OK)
  async getAssignedProjectDetails(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.consultantService.getAssignedProjectDetails(userId, projectId);
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
  @HttpCode(HttpStatus.OK)
  async getConsultantById(@Param('id') id: string) {
    return await this.consultantService.getConsultantById(id);
  }

  @Get('user/:userId')
  getConsultantByUserId(@Param('userId') userId: string) {
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
      userId
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
