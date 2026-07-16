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
  Patch
} from '@nestjs/common';
import { ConsultantService } from '../../consultants/services/consultant.service';
import { CreateConsultantDto } from '../../consultants/dto/create-consultant.dto';
import { UpdateConsultantDto } from '../../consultants/dto/update-consultant.dto';
import { Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';

@Controller('consultants')
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
  @Roles(Role.CONSULTANT_MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateConsultantProfile(
    @Param('id') consultantId: string, 
    @Body() dto: UpdateConsultantDto,): Promise<{message: string}> {
      return await this.consultantService.updateConsultantProfile(consultantId, dto);
    } 
}
