import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { CommonModule } from './common/common.module';
import { ConsultantsModule } from './consultants/consultants.module';
import { ProjectsModule } from './projects/projects.module';
import { AdminModule } from './admin/admin.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScoringModule } from './scoring/scoring.module';
import { NotificationModule } from './notification/notification.module';
import { LocationModule } from './location/location.module';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlacementsModule } from './placement/placement.module';
import { CvParsingModule } from './cv-parsing/cv-parsing.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          stores: [
            createKeyv({
              url: configService.get<string>('REDIS_URL'),
            }),
          ],
        };
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
        },
      }),
    }),
    PrismaModule,
    EmailModule,
    CommonModule,
    AuthModule,
    ConsultantsModule,
    ProjectsModule,
    ScoringModule,
    NotificationModule,
    AdminModule,
    LocationModule,
    PlacementsModule,
    CvParsingModule,
    AnalyticsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
