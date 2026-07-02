import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ScoringService } from '../../scoring/services/scoring-config.service';
import { UpdateScoringConfigDto } from '../../scoring/dto/update-scoring-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('config/scoring')
@UseGuards(JwtAuthGuard)
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getScoringConfig() {
    return this.scoringService.getScoringConfig();
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
    }),
  )
  async updateScoringConfig(
    @Body() dto: UpdateScoringConfigDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.scoringService.updateScoringConfig(dto, userId);
  }
}
