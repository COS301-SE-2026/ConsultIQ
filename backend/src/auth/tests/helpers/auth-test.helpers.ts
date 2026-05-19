
import { Role, User } from '@prisma/client';
import { LoginDto } from '../../dto/login.dto';

// ---------------------------------------------------------------------------
// Shared base fixtures
// ---------------------------------------------------------------------------

export const BASE_USER: Pick<
  User,
  'id' | 'email' | 'role' | 'failedAttempts' | 'lockedUntil'
> = {
  id: 'user-1',
  email: 'test@example.com',
  role: Role.CONSULTANT,
  failedAttempts: 0,
  lockedUntil: null,
};

export const MOCK_USER = {
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

export const MOCK_TOKEN_RECORD = {
  id: 'token-uuid-456',
  userId: MOCK_USER.id,
  token: 'hashed-token',
  type: 'ACTIVATION' as any,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  usedAt: null,
  createdAt: new Date(),
};

export const MOCK_REFRESH_TOKEN_RECORD = {
  id: 'token-123',
  userId: 'user-123',
  token: 'hashed-token',
  type: 'REFRESH' as any,
  familyId: 'family-abc',
  usedAt: null,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  user: MOCK_USER,
};

export const LOGIN_DTO: LoginDto = {
  email: 'test@example.com',
  password: 'secret',
};

export const TEST_IP = '127.0.0.1';
export const TEST_UA = 'jest-agent';

// ---------------------------------------------------------------------------
// Shared mock factories
// ---------------------------------------------------------------------------

export function createMockPrismaService() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    token: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

export function createMockCredentialService() {
  return {
    validateCredentials: jest.fn(),
    isCurrentlyLocked: jest.fn(),
  };
}

export function createMockLockoutService() {
  return {
    recordFailedAttempt: jest.fn(),
    resetFailedAttempts: jest.fn(),
  };
}

export function createMockAuditLogService() {
  return {
    log: jest.fn(),
  };
}

export function createMockEmailService() {
  return {
    sendActivationEmail: jest.fn().mockResolvedValue(undefined),
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };
}

export function createMockTokenService() {
  return {
    generateActivationToken: jest.fn().mockReturnValue({
      rawToken: 'raw-token-abc123',
      hashedToken: 'hashed-token-xyz',
    }),
    generateRefreshToken: jest.fn().mockReturnValue({
      rawToken: 'raw-token-abc',
      hashedToken: 'hashed-token-abc',
    }),
    getTokenExpiry: jest.fn().mockReturnValue(
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    ),
    getRefreshTokenExpiry: jest.fn().mockReturnValue(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ),
    hashToken: jest.fn().mockReturnValue('hashed-token'),
    isTokenExpired: jest.fn().mockReturnValue(false),
    generateAccessToken: jest.fn(),
    verifyToken: jest.fn(),
  };
}

export function createMockConfigService() {
  return {
    get: jest.fn().mockReturnValue('http://localhost:5173'),
  };
}

export function createMockRefreshTokenService() {
  return {
    createRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    revokeTokenFamily: jest.fn().mockResolvedValue(undefined),
    refresh: jest.fn().mockResolvedValue({
      accessToken: 'new-jwt',
      refreshToken: 'new-refresh-token',
    }),
  };
}

export function createMockJwtService() {
  return {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };
}

// ---------------------------------------------------------------------------
// IP / UserAgent helpers
// ---------------------------------------------------------------------------

export const makeIp = (override?: string): string =>
  override ?? TEST_IP;

export const makeUserAgent = (override?: string): string =>
  override ?? TEST_UA;