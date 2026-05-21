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
} from '@nestjs/common';
import { ProjectService } from '../../projects/services/project.service';
import { CreateProjectDto } from '../../projects/dto/create-project.dto';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createProject(@Body() dto: CreateProjectDto, @Req() req: any) {
    const userId = req.user?.sub ?? null;
    const userRole = req.user?.role ?? null;
    return await this.projectService.createProject(dto, userId, userRole);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllProjects(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Req() req: any,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const userRole = req.user?.role ?? 'PROJECT_MANAGER';
    const userId = req.user?.sub ?? null;

    return await this.projectService.getAllProjects(pageNum, limitNum, userRole, userId);
  }
}