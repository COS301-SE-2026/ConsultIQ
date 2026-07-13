import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminService } from './services/admin.service';
import { AdminController } from 'src/controllers/admin/admin.controller';

@Module({
    imports: [PrismaModule],
    providers: [AdminService],
    controllers: [AdminController],
})
export class AdminModule {}