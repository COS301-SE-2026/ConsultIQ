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
} from '@nestjs/common';
import { ConsultantService } from '../../consultants/services/consultant.service';
import { CreateConsultantDto } from '../../consultants/dto/create-consultant.dto';
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
  async getPendingProfiles(@Req() _req: any) {
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

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getConsultantById(@Param('id') id: string) {
    return await this.consultantService.getConsultantById(id);
  }
}