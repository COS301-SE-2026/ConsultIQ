import { Module } from '@nestjs/common';
import { ConsultantController } from './controllers/consultants/consultant.controller';
import { ConsultantService } from './consultants/services/consultant.service';
import { ConsultantRepository } from './consultants/repositories/consultant.repository';
import { PrismaService } from './prisma/prisma.service';

@Module({
    controllers: [ConsultantController],
    providers: [ConsultantService, ConsultantRepository, PrismaService],
})
export class ConsultantsModule {}