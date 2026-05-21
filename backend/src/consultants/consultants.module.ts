import { Module } from '@nestjs/common';
import { ConsultantController } from '../controllers/consultants/consultant.controller';
import { ConsultantService } from './services/consultant.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [ConsultantController],
  providers: [ConsultantService],
  imports: [PrismaModule],
})
export class ConsultantsModule {}
