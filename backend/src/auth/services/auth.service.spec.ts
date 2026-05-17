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

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let email: jest.Mocked<EmailService>;
  let token: jest.Mocked<TokenService>;

  const mockUser = {
    id: 'user-uuid-123',
    fullName: 'Jane Smith',
    email: 'jane@consultiq.com',
    passwordHash: null,
    role: 'CONSULTANT' as any,
    status: 'PENDING' as any,
    failedAttempts: 0,
    isLocked: false,
    lockedUntil: null,
    termsAcceptedAt: null,
    tenantId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokenRecord = {
    id: 'token-uuid-456',
    userId: mockUser.id,
    token: 'hashed-token',
    type: 'ACTIVATION' as any,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      token: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockEmail = {
      sendActivationEmail: jest.fn().mockResolvedValue(undefined),
    };

    const mockToken = {
      generateActivationToken: jest.fn().mockReturnValue({
        rawToken: 'raw-token-abc123',
        hashedToken: 'hashed-token-xyz',
      }),
      getTokenExpiry: jest.fn().mockReturnValue(
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      ),
      hashToken: jest.fn().mockReturnValue('hashed-token'),
      isTokenExpired: jest.fn().mockReturnValue(false),
    };

    const mockConfig = {
      get: jest.fn().mockReturnValue('http://localhost:5173'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
        { provide: TokenService, useValue: mockToken },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    email = module.get(EmailService);
    token = module.get(TokenService);
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
      prisma.user.create.mockResolvedValue(mockUser as any);
      prisma.token.create.mockResolvedValue(mockTokenRecord as any);

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
            userId: mockUser.id,
            type: 'ACTIVATION',
          }),
        }),
      );

      // Activation email triggered
      expect(email.sendActivationEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.fullName,
        expect.stringContaining('raw-token-abc123'),
      );

      expect(result.message).toContain('activation email has been sent');
      expect(result.userId).toBe(mockUser.id);
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.token.create).not.toHaveBeenCalled();
    });

    it('should not throw if email sending fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser as any);
      prisma.token.create.mockResolvedValue(mockTokenRecord as any);
      email.sendActivationEmail.mockRejectedValue(
        new Error('Email provider down'),
      );

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
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.token.findFirst.mockResolvedValue(mockTokenRecord as any);
      token.isTokenExpired.mockReturnValue(false);
      prisma.$transaction.mockResolvedValue([{}, {}] as any);

      const result = await service.activateAccount(dto);

      // Transaction called to atomically mark token used and activate account
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.message).toContain('activated successfully');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.activateAccount(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if account is already ACTIVE', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'ACTIVE',
      } as any);

      await expect(service.activateAccount(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if account is SUSPENDED', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED',
      } as any);

      await expect(service.activateAccount(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token record is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.token.findFirst.mockResolvedValue(null);

      await expect(service.activateAccount(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token is expired', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.token.findFirst.mockResolvedValue(mockTokenRecord as any);
      token.isTokenExpired.mockReturnValue(true);

      await expect(service.activateAccount(dto)).rejects.toThrow(
        BadRequestException,
      );
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
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'ACTIVE',
      } as any);

      const result = await service.resendVerification(mockUser.email);

      expect(result.message).toContain('pending verification');
      expect(email.sendActivationEmail).not.toHaveBeenCalled();
    });

    it('should send a new verification email for a PENDING user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.token.count.mockResolvedValue(0);
      prisma.token.create.mockResolvedValue(mockTokenRecord as any);

      const result = await service.resendVerification(mockUser.email);

      expect(prisma.token.create).toHaveBeenCalled();
      expect(result.message).toContain('pending verification');
    });

    it('should throw 429 when rate limit is exceeded', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.token.count.mockResolvedValue(3);

      await expect(
        service.resendVerification(mockUser.email),
      ).rejects.toThrow();
    });

    it('should throw with 429 status code', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.token.count.mockResolvedValue(3);

      try {
        await service.resendVerification(mockUser.email);
      } catch (e) {
        expect(e.getStatus()).toBe(429);
      }
    });

    it('should not throw if resend email fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.token.count.mockResolvedValue(0);
      prisma.token.create.mockResolvedValue(mockTokenRecord as any);
      email.sendActivationEmail.mockRejectedValue(
        new Error('Email provider down'),
      );

      await expect(
        service.resendVerification(mockUser.email),
      ).resolves.toBeDefined();
    });
  });
});