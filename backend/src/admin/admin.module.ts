import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminUserService } from './users/services/admin.user.service';
import { AdminController } from '../controllers/admin/admin.controller';
import { AdminProjectService } from './projects/services/admin.projects.service';

@Module({
    imports: [PrismaModule],
    providers: [AdminUserService, AdminProjectService],
    controllers: [AdminController],
})
export class AdminModule { }
