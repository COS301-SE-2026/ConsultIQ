import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuditOutcome, Role } from '@prisma/client';
import { Request } from 'express';

import { AuthService } from '../../services/auth.service';
import { CredentialService } from '../../services/auth.credential.service';
import { LockoutService } from '../../services/auth.lockout.service';
import { AuditLogService } from '../../services/auth.audit-log.service';
import { LoginDto } from '../../dto/login.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(overrides: Partial<Request> = {}): Request {
    return {
        headers: { 'user-agent': 'jest-agent' },
        socket: { remoteAddress: '127.0.0.1' },
        ...overrides,
    } as unknown as Request;
}

const BASE_USER = {
    id: 'user-1',
    email: 'test@example.com',
    role: Role.CONSULTANT,
    failedLoginAttempts: 0,
    lockedAt: null,
};

const LOGIN_DTO: LoginDto = { email: 'test@example.com', password: 'secret' };

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCredentialService = {
    validateCredentials: jest.fn(),
    isCurrentlyLocked: jest.fn(),
};

const mockLockoutService = {
    recordFailedAttempt: jest.fn(),
    resetFailedAttempts: jest.fn(),
};

const mockAuditLogService = {
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
    // IP extraction
    // -------------------------------------------------------------------------

    describe('IP extraction', () => {
        beforeEach(() => {

            mockCredentialService.validateCredentials.mockResolvedValue({
                outcome: 'SUCCESS',
                user: BASE_USER,
            });
            mockLockoutService.resetFailedAttempts.mockResolvedValue(undefined);
            mockAuditLogService.log.mockResolvedValue(undefined);
        });

        it('Test if first IP address is used from x-forwarded-for', async () => {
            const req = makeRequest({
                headers: {
                    'user-agent': 'jest-agent',
                    'x-forwarded-for': '203.0.113.5, 10.0.0.1',
                },
            });

            await service.login(LOGIN_DTO, req);

            expect(mockAuditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({ ipAddress: '203.0.113.5' }),
            );
        });

        it('Test to fall back to socket.remoteAddress when x-forwarded-for is absent', async () => {
            const req = makeRequest(); // remoteAddress = '127.0.0.1'

            await service.login(LOGIN_DTO, req);

            expect(mockAuditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({ ipAddress: '127.0.0.1' }),
            );
        });

        it('Test returns "unknown" when socket and header are both missing', async () => {
            const req = {
                headers: { 'user-agent': 'jest-agent' },
                socket: {},
            } as unknown as Request;

            await service.login(LOGIN_DTO, req);

            expect(mockAuditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({ ipAddress: 'unknown' }),
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
            await expect(service.login(LOGIN_DTO, makeRequest())).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('logs locked account attempt to login (ACCOUNT_LOCKED)', async () => {
            await expect(service.login(LOGIN_DTO, makeRequest())).rejects.toThrow();

            expect(mockAuditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    outcome: AuditOutcome.ACCOUNT_LOCKED,
                    userId: BASE_USER.id,
                }),
            );
        });

        it('Passes in a locked user, and safely reject request', async () => {
            await expect(service.login(LOGIN_DTO, makeRequest())).rejects.toThrow();
            expect(mockCredentialService.isCurrentlyLocked).toHaveBeenCalledWith(
                lockedUser,
            );
        });
        it('Check lockout status using the newly updated user record after a failure', async () => {

            const lockedUser = { ...BASE_USER, failedLoginAttempts: 5, lockedAt: new Date() };
            mockCredentialService.validateCredentials.mockResolvedValue({ outcome: 'INVALID_CREDENTIALS', user: BASE_USER });
            mockLockoutService.recordFailedAttempt.mockResolvedValue(lockedUser);


            await expect(service.login(LOGIN_DTO, makeRequest())).rejects.toThrow(UnauthorizedException);
            expect(mockCredentialService.isCurrentlyLocked).toHaveBeenCalledWith(lockedUser);
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

            const result = await service.login(LOGIN_DTO, makeRequest());

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

            await service.login(LOGIN_DTO, makeRequest());

            expect(mockLockoutService.resetFailedAttempts).toHaveBeenCalledWith(
                BASE_USER,
            );
        });

        it('logs SUCCESS with userId', async () => {
            mockCredentialService.validateCredentials.mockResolvedValue(
                successResult(Role.CONSULTANT),
            );

            await service.login(LOGIN_DTO, makeRequest());

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

            await service.login(LOGIN_DTO, makeRequest());

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

                const result = await service.login(LOGIN_DTO, makeRequest());

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
            await expect(service.login(LOGIN_DTO, makeRequest())).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('includes a helpful message about email verification', async () => {
            await expect(service.login(LOGIN_DTO, makeRequest())).rejects.toThrow(
                /email verification/i,
            );
        });

        it('logs ACCOUNT_PENDING with userId', async () => {
            await expect(service.login(LOGIN_DTO, makeRequest())).rejects.toThrow();

            expect(mockAuditLogService.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    outcome: AuditOutcome.ACCOUNT_PENDING,
                    userId: BASE_USER.id,
                }),
            );
        });
    });
});