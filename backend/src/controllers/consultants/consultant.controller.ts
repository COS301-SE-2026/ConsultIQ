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
  Param
} from "@nestjs/common";
import { ConsultantService } from "../../consultants/services/consultant.service";
import { CreateConsultantDto } from "../../consultants/dto/create-consultant.dto";

@Controller("consultants")
export class ConsultantController {
  constructor(private readonly consultantService: ConsultantService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createConsultant(@Body() dto: CreateConsultantDto) {
    return await this.consultantService.createConsultant(dto);
  }

  @Get()
  async getAllConsultants(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Req() req: any,
  ) {
    const userRole = req.user?.role ?? "PROJECT_MANAGER";
    return await this.consultantService.getAllConsultants(
      parseInt(page, 10),
      parseInt(limit, 10),
      userRole,
    );
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getConsultantById(@Param("id") id: string) {
    return await this.consultantService.getConsultantById(id);
  }

  @Get('user/:userId')
  getConsultantByUserId(@Param('userId') userId: string) {
    return this.consultantService.getConsultantByUserId(userId);
  }
}
