import { Module } from '@nestjs/common';
import { SkillGapService } from './services/skill-gap.service';
import { SkillGapController } from '../controllers/skill-gap-analysis/skill-gap.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [SkillGapController],
  providers: [SkillGapService],
  exports: [SkillGapService],
})
export class SkillGapModule {}
