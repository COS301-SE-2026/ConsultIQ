import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
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
  async createProject(@Body() dto: CreateProjectDto) {
    return await this.projectService.createProject(dto);
  }
}