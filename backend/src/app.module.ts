import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './email/email.module';
import { CommonModule } from './common/common.module';
import { ConsultantsModule } from './consultants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EmailModule,
    CommonModule,
    AuthModule,
    ConsultantsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }