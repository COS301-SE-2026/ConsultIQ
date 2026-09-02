import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from '../controllers/health/health.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [TerminusModule, PrismaModule],
    controllers: [HealthController],
})
export class HealthModule { }