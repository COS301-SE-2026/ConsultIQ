import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { TokenService } from '../../common/services/token.service';
import { ConfigService } from '@nestjs/config';
import { CredentialService } from './auth.credential.service';
import { LockoutService } from './auth.lockout.service';
import { AuditLogService } from './auth.audit-log.service';
import { AuditOutcome, Role } from '@prisma/client';
import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { ActivateAccountDto } from '../dto/activate-account.dto';
import * as bcrypt from 'bcrypt';
import { RefreshTokenService } from './auth.refresh-token.service';
import { JwtService } from '@nestjs/jwt';

/** Shape returned to the controller on successful login. */
export interface LoginResult {
  userId: string;
  email: string;
  role: Role;
  dashboardRoute: string;
  accessToken: string;
  refreshToken: string;
}

/** Map role -> frontend route  */
const ROLE_DASHBOARD_MAP: Record<Role, string> = {
  ADMIN: '/register',
  PROJECT_MANAGER: '/projects',
  CONSULTANT_MANAGER: '/consultants-manager',
  CONSULTANT: '/profile-view',
};

class TooManyRequestsException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly token: TokenService,
    private readonly config: ConfigService,
    private readonly credentialService: CredentialService,
    private readonly lockoutService: LockoutService,
    private readonly auditLogService: AuditLogService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwt: JwtService,
  ) {}

  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    // 1: validate credentials
    const result = await this.credentialService.validateCredentials(
      dto.email,
      dto.password,
    );

    // 2: handle each outcome
    switch (result.outcome) {
      // Unknown email
      case 'USER_NOT_FOUND': {
        await this.auditLogService.log({
          email: dto.email,
          outcome: AuditOutcome.USER_NOT_FOUND,
          ipAddress,
          userAgent,
        });

        throw new UnauthorizedException('Invalid credentials.');
      }

      // Status blocks
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

      // Account suspended (admin action)
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

      // Account locked (pre-existing lock detected before password check)
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

      // Wrong password
      case 'FAILED_PASSWORD': {
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

      // Successful login
      case 'SUCCESS': {
        await this.lockoutService.resetFailedAttempts(result.user);

        await this.auditLogService.log({
          email: dto.email,
          outcome: AuditOutcome.SUCCESS,
          userId: result.user.id,
          ipAddress,
          userAgent,
        });

        const accessToken = this.jwt.sign({
          userId: result.user.id,
          role: result.user.role,
        });

        const refreshToken = await this.refreshTokenService.createRefreshToken(
          result.user.id,
        );

        return {
          userId: result.user.id,
          email: result.user.email,
          role: result.user.role,
          dashboardRoute: ROLE_DASHBOARD_MAP[result.user.role],
          accessToken: accessToken,
          refreshToken: refreshToken,
        };
      }
    }
  }

  async createUser(dto: CreateUserDto) {
    // Check if a user with this email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(
        'An account with this email address already exists.',
      );
    }

    // Create the user record
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        role: dto.role,
        status: 'PENDING',
      },
    });

    // Generate a secure activation token
    const { rawToken, hashedToken } = this.token.generateActivationToken();
    const expiry = this.token.getTokenExpiry();

    // Store the hashed token in the Token table
    await this.prisma.token.create({
      data: {
        userId: user.id,
        token: hashedToken,
        type: 'ACTIVATION',
        expiresAt: expiry,
      },
    });

    // Build the activation link — raw token goes in the URL, never the hash
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const activationLink = `${frontendUrl}/activate?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    // Send activation email, fire and forget, does not block response
    this.email
      .sendActivationEmail(user.email, user.fullName, activationLink)
      .catch((err) => {
        console.error('Failed to send activation email:', err);
      });

    return {
      message:
        'Account created successfully. An activation email has been sent.',
      userId: user.id,
    };
  }

  async activateAccount(dto: ActivateAccountDto) {
    // Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Account not found.');
    }

    if (user.status === 'ACTIVE') {
      throw new BadRequestException('This account is already active.');
    }

    if (user.status === 'SUSPENDED') {
      throw new BadRequestException('This account has been suspended.');
    }

    // Hash the incoming token and find a matching unused token in the Token table
    const hashedIncomingToken = this.token.hashToken(dto.token);

    const tokenRecord = await this.prisma.token.findFirst({
      where: {
        userId: user.id,
        token: hashedIncomingToken,
        type: 'ACTIVATION',
        usedAt: null,
      },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid activation token.');
    }

    // Check the token has not expired
    if (this.token.isTokenExpired(tokenRecord.expiresAt)) {
      throw new BadRequestException(
        'This activation link has expired. Please contact your administrator to resend it.',
      );
    }

    // Hash the password with bcrypt at cost factor 12
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Mark the token as used and activate the account in a transaction
    await this.prisma.$transaction([
      this.prisma.token.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          status: 'ACTIVE',
        },
      }),
    ]);

    return {
      message: 'Account activated successfully. You can now log in.',
    };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (user?.status !== 'PENDING') {
      return {
        message:
          'If your account is pending verification, a new link has been sent.',
      };
    }

    // Count activation tokens created in the last hour for this user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTokenCount = await this.prisma.token.count({
      where: {
        userId: user.id,
        type: 'ACTIVATION',
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentTokenCount >= 3) {
      throw new TooManyRequestsException(
        'You have requested too many verification emails. Please wait an hour before trying again.',
      );
    }

    // Generate a fresh token and store it
    const { rawToken, hashedToken } = this.token.generateActivationToken();
    const expiry = this.token.getTokenExpiry();

    await this.prisma.token.create({
      data: {
        userId: user.id,
        token: hashedToken,
        type: 'ACTIVATION',
        expiresAt: expiry,
      },
    });

    // Send the email — fire and forget
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const activationLink = `${frontendUrl}/activate?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    this.email
      .sendActivationEmail(user.email, user.fullName, activationLink)
      .catch((err) => {
        console.error('Failed to send verification email:', err);
      });

    return {
      message:
        'If your account is pending verification, a new link has been sent.',
    };
  }

  async acceptTerms(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('Account not found.');
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Account must be active before accepting terms.',
      );
    }

    await this.prisma.user.update({
      where: { email },
      data: { termsAcceptedAt: new Date() },
    });

    return { message: 'Terms accepted successfully.' };
  }
}
