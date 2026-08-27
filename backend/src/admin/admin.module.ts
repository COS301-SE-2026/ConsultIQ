import { Module } from '@nestjs/common';
import { AdminUserService } from './users/services/admin.user.service';
import { AdminService } from './services/admin.service';
import { AdminController } from '../controllers/admin/admin.controller';
import { AdminProjectService } from './projects/services/admin.projects.service';

@Module({
  providers: [AdminUserService, AdminService, AdminProjectService],
  controllers: [AdminController],
})
export class AdminModule {}
