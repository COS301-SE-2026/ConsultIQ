
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
        sendVerificationEmail: jest.fn(),
        sendPasswordResetEmail: jest.fn(),
    };
}

export function createMockTokenService() {
    return {
        generateAccessToken: jest.fn(),
        verifyToken: jest.fn(),
    };
}

export function createMockConfigService() {
    return {
        get: jest.fn().mockReturnValue('test-value'),
    };
}

// ---------------------------------------------------------------------------
// IP / UserAgent helpers
// ---------------------------------------------------------------------------

export const makeIp = (override?: string): string =>
    override ?? TEST_IP;

export const makeUserAgent = (override?: string): string =>
    override ?? TEST_UA;