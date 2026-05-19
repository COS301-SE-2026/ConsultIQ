import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuditOutcome, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

import { AuthService } from '../../services/auth.service';
import { CredentialService } from '../../services/auth.credential.service';
import { LockoutService } from '../../services/auth.lockout.service';
import { AuditLogService } from '../../services/auth.audit-log.service';
import { EmailService } from '../../../email/services/email.service';
import { TokenService } from '../../../common/services/token.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RefreshTokenService } from '../../services/auth.refresh-token.service';
import { JwtService } from '@nestjs/jwt';

import {
  BASE_USER,
  LOGIN_DTO,
  TEST_IP,
  TEST_UA,
  makeIp,
  makeUserAgent,
  createMockPrismaService,
  createMockCredentialService,
  createMockLockoutService,
  createMockAuditLogService,
  createMockEmailService,
  createMockTokenService,
  createMockConfigService,
  createMockRefreshTokenService,
  createMockJwtService,
} from '../helpers/auth-test.helpers';

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AuthService Testing Suite', () => {
  let service: AuthService;
  let mockCredentialService: ReturnType<typeof createMockCredentialService>;
  let mockLockoutService: ReturnType<typeof createMockLockoutService>;
  let mockAuditLogService: ReturnType<typeof createMockAuditLogService>;

  beforeEach(async () => {
    mockCredentialService = createMockCredentialService();
    mockLockoutService = createMockLockoutService();
    mockAuditLogService = createMockAuditLogService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: EmailService, useValue: createMockEmailService() },
        { provide: TokenService, useValue: createMockTokenService() },
        { provide: ConfigService, useValue: createMockConfigService() },
        { provide: CredentialService, useValue: mockCredentialService },
        { provide: LockoutService, useValue: mockLockoutService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RefreshTokenService, useValue: createMockRefreshTokenService() },
        { provide: JwtService, useValue: createMockJwtService() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // -------------------------------------------------------------------------
  // IP and user-agent forwarding to audit log
  // -------------------------------------------------------------------------
  describe('IP and user-agent forwarding to audit log', () => {
    beforeEach(() => {
      mockCredentialService.validateCredentials.mockResolvedValue({
        outcome: 'SUCCESS',
        user: BASE_USER,
      });
      mockLockoutService.resetFailedAttempts.mockResolvedValue(undefined);
      mockAuditLogService.log.mockResolvedValue(undefined);
    });

    it('forwards the resolved IP address to the audit log unchanged', async () => {
      await service.login(LOGIN_DTO, '203.0.113.5', TEST_UA);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '203.0.113.5' }),
      );
    });

    it('forwards the user-agent string to the audit log unchanged', async () => {
      await service.login(LOGIN_DTO, TEST_IP, 'Mozilla/5.0 (custom)');
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ userAgent: 'Mozilla/5.0 (custom)' }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // FAILED_PASSWORD — triggers lockout on this attempt
  // -------------------------------------------------------------------------
  describe('FAILED_PASSWORD outcome — account locked by this attempt', () => {
    const lockedUser = { ...BASE_USER, failedAttempts: 5, lockedUntil: new Date() };

    beforeEach(() => {
      mockCredentialService.validateCredentials.mockResolvedValue({
        outcome: 'FAILED_PASSWORD',
        user: BASE_USER,
      });
      mockLockoutService.recordFailedAttempt.mockResolvedValue(lockedUser);
      mockCredentialService.isCurrentlyLocked.mockReturnValue(true);
      mockAuditLogService.log.mockResolvedValue(undefined);
    });

    it('throws ForbiddenException (not Unauthorized)', async () => {
      await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow(ForbiddenException);
    });

    it('logs locked account attempt to login (ACCOUNT_LOCKED)', async () => {
      await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow();
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: AuditOutcome.ACCOUNT_LOCKED, userId: BASE_USER.id }),
      );
    });

    it('passes the locked user record to isCurrentlyLocked', async () => {
      await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow();
      expect(mockCredentialService.isCurrentlyLocked).toHaveBeenCalledWith(lockedUser);
    });

    it('evaluates lockout status using the updated user record returned by recordFailedAttempt', async () => {
      const freshLockedUser = { ...BASE_USER, failedAttempts: 5, lockedUntil: new Date() };
      mockLockoutService.recordFailedAttempt.mockResolvedValue(freshLockedUser);
      mockCredentialService.isCurrentlyLocked.mockReturnValue(true);

      await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow(ForbiddenException);
      expect(mockCredentialService.isCurrentlyLocked).toHaveBeenCalledWith(freshLockedUser);
    });
  });

  // -------------------------------------------------------------------------
  // SUCCESS
  // -------------------------------------------------------------------------
  describe('SUCCESS outcome', () => {
    const successResult = (role: Role) => ({ outcome: 'SUCCESS', user: { ...BASE_USER, role } });

    beforeEach(() => {
      mockLockoutService.resetFailedAttempts.mockResolvedValue(undefined);
      mockAuditLogService.log.mockResolvedValue(undefined);
    });

    it('returns the correct LoginResult shape', async () => {
      mockCredentialService.validateCredentials.mockResolvedValue(successResult(Role.CONSULTANT));
      const result = await service.login(LOGIN_DTO, TEST_IP, TEST_UA);
      expect(result).toEqual({
        userId: BASE_USER.id,
        email: BASE_USER.email,
        role: Role.CONSULTANT,
        dashboardRoute: '/profile',
        accessToken: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('resets failed attempts on success', async () => {
      mockCredentialService.validateCredentials.mockResolvedValue(successResult(Role.CONSULTANT));
      await service.login(LOGIN_DTO, TEST_IP, TEST_UA);
      expect(mockLockoutService.resetFailedAttempts).toHaveBeenCalledWith(BASE_USER);
    });

    it('logs SUCCESS with userId', async () => {
      mockCredentialService.validateCredentials.mockResolvedValue(successResult(Role.CONSULTANT));
      await service.login(LOGIN_DTO, TEST_IP, TEST_UA);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: AuditOutcome.SUCCESS, userId: BASE_USER.id }),
      );
    });

    it('does not call recordFailedAttempt on success', async () => {
      mockCredentialService.validateCredentials.mockResolvedValue(successResult(Role.CONSULTANT));
      await service.login(LOGIN_DTO, TEST_IP, TEST_UA);
      expect(mockLockoutService.recordFailedAttempt).not.toHaveBeenCalled();
    });

    const ROLE_ROUTES: [Role, string][] = [
      [Role.ADMIN, '/admin'],
      [Role.PROJECT_MANAGER, '/projects'],
      [Role.CONSULTANT_MANAGER, '/consultant-profiles'],
      [Role.CONSULTANT, '/profile'],
    ];

    it.each(ROLE_ROUTES)('maps role %s to dashboard route %s', async (role, expectedRoute) => {
      mockCredentialService.validateCredentials.mockResolvedValue(successResult(role));
      const result = await service.login(LOGIN_DTO, TEST_IP, TEST_UA);
      expect(result.dashboardRoute).toBe(expectedRoute);
    });
  });

  // -------------------------------------------------------------------------
  // ACCOUNT_PENDING
  // -------------------------------------------------------------------------
  describe('ACCOUNT_PENDING outcome', () => {
    beforeEach(() => {
      mockCredentialService.validateCredentials.mockResolvedValue({
        outcome: 'ACCOUNT_PENDING',
        user: BASE_USER,
      });
      mockAuditLogService.log.mockResolvedValue(undefined);
    });

    it('throws ForbiddenException', async () => {
      await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow(ForbiddenException);
    });

    it('includes a helpful message about email verification', async () => {
      await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow(/email verification/i);
    });

    it('logs ACCOUNT_PENDING with userId', async () => {
      await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow();
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: AuditOutcome.ACCOUNT_PENDING, userId: BASE_USER.id }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // USER_NOT_FOUND
  // -------------------------------------------------------------------------
  describe('USER_NOT_FOUND outcome', () => {
    beforeEach(() => {
      mockCredentialService.validateCredentials.mockResolvedValue({ outcome: 'USER_NOT_FOUND' });
      mockAuditLogService.log.mockResolvedValue(undefined);
    });

    it('throws UnauthorizedException', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow(UnauthorizedException);
    });

    it('logs USER_NOT_FOUND without a userId', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow();
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ email: LOGIN_DTO.email, outcome: AuditOutcome.USER_NOT_FOUND }),
      );
      expect(mockAuditLogService.log).toHaveBeenCalledTimes(1);
      const call = mockAuditLogService.log.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
      expect(call.userId).toBeUndefined();
    });

    it('does not touch lockout service', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow();
      expect(mockLockoutService.recordFailedAttempt).not.toHaveBeenCalled();
      expect(mockLockoutService.resetFailedAttempts).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // ACCOUNT_SUSPENDED
  // -------------------------------------------------------------------------
  describe('ACCOUNT_SUSPENDED outcome', () => {
    beforeEach(() => {
      mockCredentialService.validateCredentials.mockResolvedValue({
        outcome: 'ACCOUNT_SUSPENDED',
        user: BASE_USER,
      });
      mockAuditLogService.log.mockResolvedValue(undefined);
    });

    it('throws ForbiddenException', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow(ForbiddenException);
    });

    it('message mentions contacting support', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow(/contact support/i);
    });

    it('logs ACCOUNT_SUSPENDED with userId', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow();
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: AuditOutcome.ACCOUNT_SUSPENDED, userId: BASE_USER.id }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // ACCOUNT_LOCKED (pre-existing lock)
  // -------------------------------------------------------------------------
  describe('ACCOUNT_LOCKED outcome (pre-existing)', () => {
    beforeEach(() => {
      mockCredentialService.validateCredentials.mockResolvedValue({
        outcome: 'ACCOUNT_LOCKED',
        user: BASE_USER,
      });
      mockAuditLogService.log.mockResolvedValue(undefined);
    });

    it('throws ForbiddenException', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow(ForbiddenException);
    });

    it('message mentions administrator unlock', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow(/administrator/i);
    });

    it('logs ACCOUNT_LOCKED with userId', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow();
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: AuditOutcome.ACCOUNT_LOCKED, userId: BASE_USER.id }),
      );
    });

    it('does not call lockout service (no new attempt to record)', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow();
      expect(mockLockoutService.recordFailedAttempt).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // FAILED_PASSWORD — does NOT trigger a new lockout
  // -------------------------------------------------------------------------
  describe('FAILED_PASSWORD outcome — account not yet locked', () => {
    const updatedUser = { ...BASE_USER, failedLoginAttempts: 1 };

    beforeEach(() => {
      mockCredentialService.validateCredentials.mockResolvedValue({
        outcome: 'FAILED_PASSWORD',
        user: BASE_USER,
      });
      mockLockoutService.recordFailedAttempt.mockResolvedValue(updatedUser);
      mockCredentialService.isCurrentlyLocked.mockReturnValue(false);
      mockAuditLogService.log.mockResolvedValue(undefined);
    });

    it('throws UnauthorizedException', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow(UnauthorizedException);
    });

    it('increments the failed attempt counter', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow();
      expect(mockLockoutService.recordFailedAttempt).toHaveBeenCalledWith(BASE_USER);
    });

    it('logs FAILED_PASSWORD (not ACCOUNT_LOCKED)', async () => {
      await expect(service.login(LOGIN_DTO, makeIp(), makeUserAgent())).rejects.toThrow();
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: AuditOutcome.FAILED_PASSWORD, userId: BASE_USER.id }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Audit log userAgent propagation
  // -------------------------------------------------------------------------
  describe('audit log userAgent propagation', () => {
    it('passes userAgent from the request header to the audit log', async () => {
      mockCredentialService.validateCredentials.mockResolvedValue({ outcome: 'USER_NOT_FOUND' });
      mockAuditLogService.log.mockResolvedValue(undefined);

      await expect(
        service.login(LOGIN_DTO, '127.0.0.1', 'Mozilla/5.0 (custom)'),
      ).rejects.toThrow();

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ userAgent: 'Mozilla/5.0 (custom)' }),
      );
    });
  });
});