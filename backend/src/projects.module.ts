import { Module } from '@nestjs/common';
import { ProjectController } from './controllers/projects/project.controller';
import { ProjectService } from './projects/services/project.service';
import { ProjectRepository } from './projects/repositories/project.repository';
import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ProjectController],
    providers: [ProjectService, ProjectRepository],
})
export class ProjectsModule { }