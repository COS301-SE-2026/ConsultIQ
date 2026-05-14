import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
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

describe('AuthService - IP extraction', () => {
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

});