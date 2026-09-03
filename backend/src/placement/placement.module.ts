import { Module } from '@nestjs/common';
import { PlacementController } from '../controllers/placement/placement.controller';
import { PlacementService } from './services/placement.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  controllers: [PlacementController],
  providers: [PlacementService],
  imports: [PrismaModule, AuditLogModule],
  exports: [PlacementService],
})
export class PlacementsModule {}
