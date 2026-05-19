import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from '../controllers/auth/auth.controller';
import { AuthService } from './services/auth.service';
import { CredentialService } from './services/auth.credential.service';
import { LockoutService } from './services/auth.lockout.service';
import { AuditLogService } from './services/auth.audit-log.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RefreshTokenService } from './services/auth.refresh-token.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    // Rate-limit the /auth/login route at the HTTP layer as a first defence.
    ThrottlerModule.forRoot([
      {
        name: 'login',
        ttl: 60000, // 1 minute window
        limit: 5, // max 5 requests per ttl window per IP
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    CredentialService,
    LockoutService,
    AuditLogService,
    RefreshTokenService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule { }
