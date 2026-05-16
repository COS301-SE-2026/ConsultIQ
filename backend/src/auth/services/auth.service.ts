import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  // TooManyRequestsException,
} from '@nestjs/common';
import { Request } from 'express';
import { CredentialService } from './auth.credential.service';
import { LockoutService } from './auth.lockout.service';
import { AuditLogService } from './auth.audit-log.service';
import { AuditOutcome, Role } from '@prisma/client';
import { LoginDto } from '../dto/login.dto';

/** Shape returned to the controller on successful login. */
export interface LoginResult {
  userId: string;
  email: string;
  role: Role;
  /** Redirect to dashboard route */
  dashboardRoute: string;
}

/** Map role -> frontend route  */
const ROLE_DASHBOARD_MAP: Record<Role, string> = {
  ADMIN: '/admin',
  PROJECT_MANAGER: '/projects',
  CONSULTANT_MANAGER: '/consultant-profiles',
  CONSULTANT: '/profile',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly credentialService: CredentialService,
    private readonly lockoutService: LockoutService,
    private readonly auditLogService: AuditLogService,
  ) { }

  // Now expects 3 arguments!
  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    // 1: validate credentials (you can delete the old ip/userAgent extraction logic)
    const result = await this.credentialService.validateCredentials(
      dto.email,
      dto.password,
    );

    //  2: handle each outcome
    switch (result.outcome) {
      //  Unknown email
      case 'USER_NOT_FOUND': {
        await this.auditLogService.log({
          email: dto.email,
          outcome: AuditOutcome.USER_NOT_FOUND,
          ipAddress,
          userAgent,
        });

        throw new UnauthorizedException('Invalid credentials.');
      }

      //  Status blocks
      case 'ACCOUNT_PENDING': {
        await this.auditLogService.log({
          email: dto.email,
          outcome: AuditOutcome.ACCOUNT_PENDING,
          userId: result.user.id,
          ipAddress,
          userAgent,
        });
        throw new ForbiddenException(
          'Your account is pending email verification. Please verify your email before logging in.',
        );
      }
      //  Account suspended (admin action)
      case 'ACCOUNT_SUSPENDED': {
        await this.auditLogService.log({
          email: dto.email,
          outcome: AuditOutcome.ACCOUNT_SUSPENDED,
          userId: result.user.id,
          ipAddress,
          userAgent,
        });
        throw new ForbiddenException(
          'Your account has been suspended. Please contact support.',
        );
      }

      //  Account locked (pre-existing lock detected before password check)
      case 'ACCOUNT_LOCKED': {
        await this.auditLogService.log({
          email: dto.email,
          outcome: AuditOutcome.ACCOUNT_LOCKED,
          userId: result.user.id,
          ipAddress,
          userAgent,
        });
        throw new ForbiddenException(
          'Your account has been locked due to too many failed login attempts. ' +
          'Please contact an administrator to unlock your account.',
        );
      }

      //  Wrong password
      case 'FAILED_PASSWORD': {
        // Increment failed-attempt counter
        const updatedUser = await this.lockoutService.recordFailedAttempt(
          result.user,
        );

        const nowLocked = this.credentialService.isCurrentlyLocked(updatedUser);

        await this.auditLogService.log({
          email: dto.email,
          outcome: nowLocked
            ? AuditOutcome.ACCOUNT_LOCKED
            : AuditOutcome.FAILED_PASSWORD,
          userId: result.user.id,
          ipAddress,
          userAgent,
        });

        if (nowLocked) {
          throw new ForbiddenException(
            'Your account has been locked due to too many failed login attempts. ' +
            'Please contact an administrator to unlock your account.',
          );
        }

        throw new UnauthorizedException('Invalid credentials.');
      }
      //  Successful login
      case 'SUCCESS': {
        // Reset the failure counter
        await this.lockoutService.resetFailedAttempts(result.user);

        await this.auditLogService.log({
          email: dto.email,
          outcome: AuditOutcome.SUCCESS,
          userId: result.user.id,
          ipAddress,
          userAgent,
        });

        return {
          userId: result.user.id,
          email: result.user.email,
          role: result.user.role,
          dashboardRoute: ROLE_DASHBOARD_MAP[result.user.role],
        };
      }
    }
  }

}
