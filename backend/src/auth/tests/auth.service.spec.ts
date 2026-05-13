// src/auth/tests/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { CredentialService } from '../services/credential.service';
import { LockoutService } from '../services/auth.lockout.service';
import { AuditLogService } from '../services/audit-log.service';
import { AuditOutcome, Role, UserStatus } from '@prisma/client';

// ── Shared mock builders ─────────────────────────────────────────────────────

const makeUser = (overrides = {}) => ({
    id: 'user-uuid-1',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashed',
    role: Role.CONSULTANT,
    status: UserStatus.ACTIVE,
    failedAttempts: 0,
    isLocked: false,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const makeRequest = (ip = '127.0.0.1') =>
({
    headers: { 'user-agent': 'jest-test' },
    socket: { remoteAddress: ip },
} as any);

// ── Test suite ───────────────────────────────────────────────────────────────

describe('AuthService', () => {
    let authService: AuthService;
    let credentialService: jest.Mocked<CredentialService>;
    let lockoutService: jest.Mocked<LockoutService>;
    let auditLogService: jest.Mocked<AuditLogService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: CredentialService,
                    useValue: {
                        validateCredentials: jest.fn(),
                        isCurrentlyLocked: jest.fn(),
                    },
                },
                {
                    provide: LockoutService,
                    useValue: {
                        recordFailedAttempt: jest.fn(),
                        resetFailedAttempts: jest.fn(),
                    },
                },
                {
                    provide: AuditLogService,
                    useValue: { log: jest.fn() },
                },
            ],
        }).compile();

        authService = module.get(AuthService);
        credentialService = module.get(CredentialService);
        lockoutService = module.get(LockoutService);
        auditLogService = module.get(AuditLogService);
    });

    const dto = { email: 'test@example.com', password: 'Secret123!' };

    // ── Success path ─────────────────────────────────────────────────────────
    describe('successful login', () => {
        it('returns LoginResult with correct dashboardRoute for CONSULTANT', async () => {
            const user = makeUser();
            credentialService.validateCredentials.mockResolvedValue({
                outcome: 'SUCCESS',
                user,
            });

            const result = await authService.login(dto, makeRequest());

            expect(result.dashboardRoute).toBe('/profile');
            expect(result.role).toBe(Role.CONSULTANT);
            expect(lockoutService.resetFailedAttempts).toHaveBeenCalledWith(user);
            expect(auditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({ outcome: AuditOutcome.SUCCESS }),
            );
        });

        it('maps ADMIN role to /admin dashboard', async () => {
            const user = makeUser({ role: Role.ADMIN });
            credentialService.validateCredentials.mockResolvedValue({
                outcome: 'SUCCESS',
                user,
            });

            const result = await authService.login(dto, makeRequest());
            expect(result.dashboardRoute).toBe('/admin');
        });
    });

    // ── Unknown email ─────────────────────────────────────────────────────────
    describe('user not found', () => {
        it('throws generic UnauthorizedException — no email hint', async () => {
            credentialService.validateCredentials.mockResolvedValue({
                outcome: 'USER_NOT_FOUND',
            });

            await expect(authService.login(dto, makeRequest())).rejects.toThrow(
                UnauthorizedException,
            );
            expect(auditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({ outcome: AuditOutcome.USER_NOT_FOUND }),
            );
        });
    });

    // ── Status blocks ─────────────────────────────────────────────────────────
    describe('account status checks', () => {
        it('throws ForbiddenException for PENDING_VERIFICATION accounts', async () => {
            const user = makeUser({ status: UserStatus.PENDING_VERIFICATION });
            credentialService.validateCredentials.mockResolvedValue({
                outcome: 'ACCOUNT_PENDING',
                user,
            });

            await expect(authService.login(dto, makeRequest())).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('throws ForbiddenException for SUSPENDED accounts', async () => {
            const user = makeUser({ status: UserStatus.SUSPENDED });
            credentialService.validateCredentials.mockResolvedValue({
                outcome: 'ACCOUNT_SUSPENDED',
                user,
            });

            await expect(authService.login(dto, makeRequest())).rejects.toThrow(
                ForbiddenException,
            );
        });
    });

    // ── Lockout ───────────────────────────────────────────────────────────────
    describe('account lockout', () => {
        it('throws ForbiddenException when account is already locked', async () => {
            const user = makeUser({ isLocked: true, status: UserStatus.LOCKED });
            credentialService.validateCredentials.mockResolvedValue({
                outcome: 'ACCOUNT_LOCKED',
                user,
            });

            await expect(authService.login(dto, makeRequest())).rejects.toThrow(
                ForbiddenException,
            );
            expect(auditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({ outcome: AuditOutcome.ACCOUNT_LOCKED }),
            );
        });

        it('locks the account and throws ForbiddenException on the 5th failed attempt', async () => {
            const user = makeUser({ failedAttempts: 4 });
            const lockedUser = makeUser({ failedAttempts: 5, isLocked: true });

            credentialService.validateCredentials.mockResolvedValue({
                outcome: 'FAILED_PASSWORD',
                user,
            });
            lockoutService.recordFailedAttempt.mockResolvedValue(lockedUser);
            credentialService.isCurrentlyLocked.mockReturnValue(true);

            await expect(authService.login(dto, makeRequest())).rejects.toThrow(
                ForbiddenException,
            );
            expect(auditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({ outcome: AuditOutcome.ACCOUNT_LOCKED }),
            );
        });

        it('throws generic UnauthorizedException on failed attempt before threshold', async () => {
            const user = makeUser({ failedAttempts: 2 });
            const updatedUser = makeUser({ failedAttempts: 3 });

            credentialService.validateCredentials.mockResolvedValue({
                outcome: 'FAILED_PASSWORD',
                user,
            });
            lockoutService.recordFailedAttempt.mockResolvedValue(updatedUser);
            credentialService.isCurrentlyLocked.mockReturnValue(false);

            await expect(authService.login(dto, makeRequest())).rejects.toThrow(
                UnauthorizedException,
            );
            // AC-3: message must not hint at email vs password
            await expect(authService.login(dto, makeRequest())).rejects.toThrow(
                'Invalid credentials.',
            );
        });
    });

    // ── Audit logging ─────────────────────────────────────────────────────────
    describe('audit logging', () => {
        it('always calls auditLogService.log regardless of outcome', async () => {
            credentialService.validateCredentials.mockResolvedValue({
                outcome: 'USER_NOT_FOUND',
            });

            await authService.login(dto, makeRequest()).catch(() => { });
            expect(auditLogService.log).toHaveBeenCalledTimes(1);
        });

        it('captures IP address in the audit log', async () => {
            credentialService.validateCredentials.mockResolvedValue({
                outcome: 'USER_NOT_FOUND',
            });

            await authService.login(dto, makeRequest('203.0.113.42')).catch(() => { });
            expect(auditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({ ipAddress: '203.0.113.42' }),
            );
        });
    });
});