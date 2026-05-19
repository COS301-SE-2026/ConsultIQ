import { Body, Controller, HttpCode, HttpStatus, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConsultantService } from '../../consultants/services/consultant.service';
import { CreateConsultantDto } from '../../consultants/dto/create-consultant.dto';

@Controller('consultants')
export class ConsultantController {
  constructor(private readonly consultantService: ConsultantService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createConsultant(@Body() dto: CreateConsultantDto) {
    return await this.consultantService.createConsultant(dto);
  }
}