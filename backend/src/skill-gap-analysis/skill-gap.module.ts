import { Module } from '@nestjs/common';
import { SkillGapService } from './services/skill-gap.service';
import { SkillGapController } from '../controllers/skill-gap-analysis/skill-gap.controller';

@Module({
    controllers: [SkillGapController],
    providers: [SkillGapService],
    exports: [SkillGapService],
})
export class SkillGapModule { }