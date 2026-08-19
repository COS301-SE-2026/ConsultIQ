import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlacementService } from '../../placement/services/placement.service';
import { CreatePlacementDto } from '../../placement/dto/create-placement.dto';

@Controller('projects/:id/placements')
@UseGuards(JwtAuthGuard)
export class PlacementController {
  constructor(private readonly placementService: PlacementService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createPlacement(
    @Param('id') projectId: string,
    @Body() dto: CreatePlacementDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Authentication required.');
    }
    return this.placementService.createPlacement(projectId, dto, userId);
  }
}