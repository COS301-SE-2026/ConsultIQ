import { Module } from '@nestjs/common';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './services/auth.service';
import { CredentialService } from './services/auth.credential.service';
import { LockoutService } from './services/auth.lockout.service';
import { AuditLogService } from './services/auth.audit-log.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserService } from './services/auth.service';

@Module({
  imports: [
    PrismaModule,
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
    UserService,
  ],
  exports: [AuthService, UserService],
})
export class AuthModule {}
