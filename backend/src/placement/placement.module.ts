import { Module } from '@nestjs/common'
import { PlacementController } from 'src/controllers/placement/placement.controller'
import { PlacementService } from './services/placement.service'
import { PrismaModule } from 'src/prisma/prisma.module'

@Module({
    controllers: [PlacementController],
    providers: [PlacementService],
    imports: [PrismaModule],
    exports: [PlacementService],
})
export class PlacementsModule {}