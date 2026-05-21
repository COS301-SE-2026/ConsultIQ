import { Module } from '@nestjs/common';
import { ProjectController } from '../controllers/projects/project.controller';
import { ProjectService } from './services/project.service';
import { ProjectRepository } from './repositories/project.repository';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, ProjectRepository, PrismaService],
})
export class ProjectsModule {}