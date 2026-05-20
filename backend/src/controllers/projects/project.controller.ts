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
import { SkipThrottle } from '@nestjs/throttler';

interface ProjectResponse {
  message: string;
  projectId: string;
}

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @SkipThrottle()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createProject(@Body() dto: CreateProjectDto): Promise<ProjectResponse> {
    return await this.projectService.createProject(dto);
  }
}
