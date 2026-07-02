import { Module } from '@nestjs/common';
import { ScoringService } from './services/scoring-config.service';
import { ScoringController } from '../controllers/scoring/scoring.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ScoringController],
  providers: [ScoringService, PrismaService],
})
export class ScoringModule {}
