import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AuditOutcome, Role, User } from '@prisma/client';

import { AuthService } from '../../services/auth.service';
import { CredentialService } from '../../services/auth.credential.service';
import { LockoutService } from '../../services/auth.lockout.service';
import { AuditLogService } from '../../services/auth.audit-log.service';
import { LoginDto } from '../../dto/login.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_USER: Pick<User, 'id' | 'email' | 'role' | 'failedLoginAttempts' | 'lockedAt'> = {
    id: 'user-1',
    email: 'test@example.com',
    role: Role.CONSULTANT,
    failedLoginAttempts: 0,
    lockedAt: null,
};

const LOGIN_DTO: LoginDto = { email: 'test@example.com', password: 'secret' };

const TEST_IP = '203.0.113.5';
const TEST_UA = 'jest-agent';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

interface MockCredentialService {
    validateCredentials: jest.MockedFunction<() => Promise<unknown>>;
    isCurrentlyLocked: jest.MockedFunction<() => boolean>;
}

interface MockLockoutService {
    recordFailedAttempt: jest.MockedFunction<() => Promise<unknown>>;
    resetFailedAttempts: jest.MockedFunction<() => Promise<void>>;
}

interface MockAuditLogService {
    log: jest.MockedFunction<() => Promise<void>>;
}

const mockCredentialService: MockCredentialService = {
    validateCredentials: jest.fn(),
    isCurrentlyLocked: jest.fn(),
};

const mockLockoutService: MockLockoutService = {
    recordFailedAttempt: jest.fn(),
    resetFailedAttempts: jest.fn(),
};

const mockAuditLogService: MockAuditLogService = {
    log: jest.fn(),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AuthService Testing Suite', () => {
    let service: AuthService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: CredentialService, useValue: mockCredentialService },
                { provide: LockoutService, useValue: mockLockoutService },
                { provide: AuditLogService, useValue: mockAuditLogService },
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
    // Wrong password entry and account lockout after 5 failed attempts
    // -------------------------------------------------------------------------

    describe('FAILED_PASSWORD outcome — account locked by this attempt', () => {
        const lockedUser = {
            ...BASE_USER,
            failedLoginAttempts: 5,
            lockedAt: new Date(),
        };

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
            await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('logs locked account attempt to login (ACCOUNT_LOCKED)', async () => {
            await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow();

            expect(mockAuditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    outcome: AuditOutcome.ACCOUNT_LOCKED,
                    userId: BASE_USER.id,
                }),
            );
        });

        it('passes the locked user record to isCurrentlyLocked', async () => {
            await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow();

            expect(mockCredentialService.isCurrentlyLocked).toHaveBeenCalledWith(
                lockedUser,
            );
        });

        it('evaluates lockout status using the updated user record returned by recordFailedAttempt', async () => {
            const freshLockedUser = { ...BASE_USER, failedLoginAttempts: 5, lockedAt: new Date() };

            mockCredentialService.validateCredentials.mockResolvedValue({
                outcome: 'FAILED_PASSWORD',
                user: BASE_USER,
            });
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
        const successResult = (role: Role) => ({
            outcome: 'SUCCESS',
            user: { ...BASE_USER, role },
        });

        beforeEach(() => {
            mockLockoutService.resetFailedAttempts.mockResolvedValue(undefined);
            mockAuditLogService.log.mockResolvedValue(undefined);
        });

        it('returns the correct LoginResult shape', async () => {
            mockCredentialService.validateCredentials.mockResolvedValue(
                successResult(Role.CONSULTANT),
            );

            const result = await service.login(LOGIN_DTO, TEST_IP, TEST_UA);

            expect(result).toEqual({
                userId: BASE_USER.id,
                email: BASE_USER.email,
                role: Role.CONSULTANT,
                dashboardRoute: '/profile',
            });
        });

        it('resets failed attempts on success', async () => {
            mockCredentialService.validateCredentials.mockResolvedValue(
                successResult(Role.CONSULTANT),
            );

            await service.login(LOGIN_DTO, TEST_IP, TEST_UA);

            expect(mockLockoutService.resetFailedAttempts).toHaveBeenCalledWith(BASE_USER);
        });

        it('logs SUCCESS with userId', async () => {
            mockCredentialService.validateCredentials.mockResolvedValue(
                successResult(Role.CONSULTANT),
            );

            await service.login(LOGIN_DTO, TEST_IP, TEST_UA);

            expect(mockAuditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    outcome: AuditOutcome.SUCCESS,
                    userId: BASE_USER.id,
                }),
            );
        });

        it('does not call recordFailedAttempt on success', async () => {
            mockCredentialService.validateCredentials.mockResolvedValue(
                successResult(Role.CONSULTANT),
            );

            await service.login(LOGIN_DTO, TEST_IP, TEST_UA);

            expect(mockLockoutService.recordFailedAttempt).not.toHaveBeenCalled();
        });

        // Dashboard routing
        const ROLE_ROUTES: [Role, string][] = [
            [Role.ADMIN, '/admin'],
            [Role.PROJECT_MANAGER, '/projects'],
            [Role.CONSULTANT_MANAGER, '/consultant-profiles'],
            [Role.CONSULTANT, '/profile'],
        ];

        it.each(ROLE_ROUTES)(
            'maps role %s to dashboard route %s',
            async (role, expectedRoute) => {
                mockCredentialService.validateCredentials.mockResolvedValue(
                    successResult(role),
                );

                const result = await service.login(LOGIN_DTO, TEST_IP, TEST_UA);

                expect(result.dashboardRoute).toBe(expectedRoute);
            },
        );
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
            await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('includes a helpful message about email verification', async () => {
            await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow(
                /email verification/i,
            );
        });

        it('logs ACCOUNT_PENDING with userId', async () => {
            await expect(service.login(LOGIN_DTO, TEST_IP, TEST_UA)).rejects.toThrow();

            expect(mockAuditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    outcome: AuditOutcome.ACCOUNT_PENDING,
                    userId: BASE_USER.id,
                }),
            );
        });
    });
});