import { Module } from '@nestjs/common';
import { ScoringService } from './services/scoring-config.service';
import { ScoringController } from '../controllers/scoring/scoring.controller';
import { ScoringRepository } from './repositories/scoring-config.repository';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ScoringController],
  providers: [ScoringService, ScoringRepository, PrismaService],
})
export class ScoringModule {}
