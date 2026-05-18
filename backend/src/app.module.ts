import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EmailModule } from './email/email.module';
import { CommonModule } from './common/common.module';
<<<<<<< HEAD
import { AuthModule } from './auth/auth.module';
import { ConsultantsModule } from './consultants.module';
=======
>>>>>>> origin/dev

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'resend',
        ttl: 3600000,
        limit: 3,
      },
    ]),
    PrismaModule,
    EmailModule,
    CommonModule,
    AuthModule,
    ConsultantsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}