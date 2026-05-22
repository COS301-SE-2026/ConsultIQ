/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { TokenService } from '../../common/services/token.service';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CredentialService } from './auth.credential.service';
import { LockoutService } from './auth.lockout.service';
import { AuditLogService } from './auth.audit-log.service';
import { RefreshTokenService } from './auth.refresh-token.service';
import { JwtService } from '@nestjs/jwt';

import {
  MOCK_USER,
  MOCK_TOKEN_RECORD,
  createMockPrismaService,
  createMockEmailService,
  createMockTokenService,
  createMockConfigService,
  createMockCredentialService,
  createMockLockoutService,
  createMockAuditLogService,
  createMockRefreshTokenService,
  createMockJwtService,
} from '../tests/helpers/auth-test.helpers';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let email: ReturnType<typeof createMockEmailService>;
  let token: ReturnType<typeof createMockTokenService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    email = createMockEmailService();
    token = createMockTokenService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
        { provide: TokenService, useValue: token },
        { provide: ConfigService, useValue: createMockConfigService() },
        { provide: CredentialService, useValue: createMockCredentialService() },
        { provide: LockoutService, useValue: createMockLockoutService() },
        { provide: AuditLogService, useValue: createMockAuditLogService() },
        { provide: RefreshTokenService, useValue: createMockRefreshTokenService() },
        { provide: JwtService, useValue: createMockJwtService() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ---------------------------------------createUser-------------------------------------------

  describe('createUser', () => {
    const dto = {
      fullName: 'Jane Smith',
      email: 'jane@consultiq.com',
      role: 'CONSULTANT' as any,
    };

    it('should create a user and send an activation email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(MOCK_USER as any);
      prisma.token.create.mockResolvedValue(MOCK_TOKEN_RECORD as any);

      const result = await service.createUser(dto);

      // User created with correct data
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullName: dto.fullName,
            email: dto.email,
            role: dto.role,
            status: 'PENDING',
          }),
        }),
      );

      // Token record created in Token table
      expect(prisma.token.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: MOCK_USER.id,
            type: 'ACTIVATION',
          }),
        }),
      );

      // Activation email triggered
      expect(email.sendActivationEmail).toHaveBeenCalledWith(
        MOCK_USER.email,
        MOCK_USER.fullName,
        expect.stringContaining('raw-token-abc123'),
      );

      expect(result.message).toContain('activation email has been sent');
      expect(result.userId).toBe(MOCK_USER.id);
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER as any);

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.token.create).not.toHaveBeenCalled();
    });

    it('should not throw if email sending fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => { });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(MOCK_USER as any);
      prisma.token.create.mockResolvedValue(MOCK_TOKEN_RECORD as any);
      email.sendActivationEmail.mockRejectedValue(new Error('Email provider down'));

      await expect(service.createUser(dto)).resolves.toBeDefined();
    });
  });

  // ---------------------------------------activateAccount-------------------------------------------

  describe('activateAccount', () => {
    const dto = {
      email: 'jane@consultiq.com',
      token: 'raw-token-abc123',
      password: 'Tr0ub4dor@3',
    };

    it('should activate the account successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER as any);
      prisma.token.findFirst.mockResolvedValue(MOCK_TOKEN_RECORD as any);
      token.isTokenExpired.mockReturnValue(false);
      prisma.$transaction.mockResolvedValue([{}, {}] as any);

      const result = await service.activateAccount(dto);

      // Transaction called to atomically mark token used and activate account
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.message).toContain('activated successfully');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.activateAccount(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if account is already ACTIVE', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...MOCK_USER, status: 'ACTIVE' } as any);

      await expect(service.activateAccount(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if account is SUSPENDED', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...MOCK_USER, status: 'SUSPENDED' } as any);

      await expect(service.activateAccount(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token record is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER as any);
      prisma.token.findFirst.mockResolvedValue(null);

      await expect(service.activateAccount(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token is expired', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER as any);
      prisma.token.findFirst.mockResolvedValue(MOCK_TOKEN_RECORD as any);
      token.isTokenExpired.mockReturnValue(true);

      await expect(service.activateAccount(dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------resendVerification-------------------------------------------

  describe('resendVerification', () => {
    it('should return generic message if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.resendVerification('nobody@consultiq.com');

      expect(result.message).toContain('pending verification');
      expect(email.sendActivationEmail).not.toHaveBeenCalled();
    });

    it('should return generic message if user is already ACTIVE', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...MOCK_USER, status: 'ACTIVE' } as any);

      const result = await service.resendVerification(MOCK_USER.email);

      expect(result.message).toContain('pending verification');
      expect(email.sendActivationEmail).not.toHaveBeenCalled();
    });

    it('should send a new verification email for a PENDING user', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER as any);
      prisma.token.count.mockResolvedValue(0);
      prisma.token.create.mockResolvedValue(MOCK_TOKEN_RECORD as any);

      const result = await service.resendVerification(MOCK_USER.email);

      expect(prisma.token.create).toHaveBeenCalled();
      expect(result.message).toContain('pending verification');
    });

    it('should throw 429 when rate limit is exceeded', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER as any);
      prisma.token.count.mockResolvedValue(3);

      await expect(service.resendVerification(MOCK_USER.email)).rejects.toThrow();
    });

    it('should throw with 429 status code', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER as any);
      prisma.token.count.mockResolvedValue(3);

      try {
        await service.resendVerification(MOCK_USER.email);
      } catch (e) {
        expect((e as any).getStatus()).toBe(429);
      }
    });

    it('should not throw if resend email fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => { });
      prisma.user.findUnique.mockResolvedValue(MOCK_USER as any);
      prisma.token.count.mockResolvedValue(0);
      prisma.token.create.mockResolvedValue(MOCK_TOKEN_RECORD as any);
      email.sendActivationEmail.mockRejectedValue(new Error('Email provider down'));

      await expect(service.resendVerification(MOCK_USER.email)).resolves.toBeDefined();
    });
  });
});