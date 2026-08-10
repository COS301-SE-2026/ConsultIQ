import { Module } from '@nestjs/common';
import { ConsultantController } from '../controllers/consultants/consultant.controller';
import { ConsultantService } from './services/consultant.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CvParsingModule } from '../cv-parsing/cv-parsing.module';

@Module({
  controllers: [ConsultantController],
  providers: [ConsultantService],
  imports: [PrismaModule, CvParsingModule],
})
export class ConsultantsModule {}
