import { Module } from '@nestjs/common';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsController } from 'src/controllers/analytics/analytics.comtoller';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}