import { Module } from '@nestjs/common';
import { ProjectController } from '../controllers/projects/project.controller';
import { ProjectService } from './services/project.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, PrismaService],
})
export class ProjectsModule {}
