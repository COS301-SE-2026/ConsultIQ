import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';

import { LockoutService } from '../../services/auth.lockout.service';
import { PrismaService } from '../../../prisma/prisma.service';



const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: 'user-1',
        email: 'test@example.com',
        failedAttempts: 0,
        isLocked: false,
        lockedUntil: null,
        status: UserStatus.ACTIVE,
        ...overrides,
    } as User;
}

const inMinutes = (minutes: number) =>
    new Date(Date.now() + minutes * 60 * 1000);

const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60 * 1000);

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

interface PrismaUserDelegate {
    update: jest.MockedFunction<(args: Prisma.UserUpdateArgs) => Promise<User>>;
}

interface MockPrismaService {
    user: PrismaUserDelegate;
}

const mockPrismaUser: PrismaUserDelegate = {
    update: jest.fn(),
};

const mockPrisma: MockPrismaService = {
    user: mockPrismaUser,
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('LockoutService', () => {
    let service: LockoutService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LockoutService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<LockoutService>(LockoutService);
    });

    // -------------------------------------------------------------------------
    // recordFailedAttempt
    // -------------------------------------------------------------------------

    describe('recordFailedAttempt()', () => {
        describe('below the lockout threshold', () => {
            it('increments failedAttempts by 1 without locking', async () => {
                const user = makeUser({ failedAttempts: 1 });
                const updatedUser = makeUser({ failedAttempts: 2 });
                mockPrismaUser.update.mockResolvedValue(updatedUser);

                const result = await service.recordFailedAttempt(user);

                expect(mockPrismaUser.update).toHaveBeenCalledWith({
                    where: { id: user.id },
                    data: { failedAttempts: 2 },
                });
                expect(result).toEqual(updatedUser);
            });

            it('does not set status or lockedUntil before the threshold', async () => {
                const user = makeUser({ failedAttempts: 3 });
                mockPrismaUser.update.mockResolvedValue(makeUser({ failedAttempts: 4 }));

                await service.recordFailedAttempt(user);

                const data = mockPrismaUser.update.mock.calls[0]?.[0]?.data as Prisma.UserUpdateInput;

                expect(data.status).toBeUndefined();
                expect(data.lockedUntil).toBeUndefined();
                expect(data.isLocked).toBeUndefined();
            });

            it.each([0, 1, 2, 3])(
                'does not lock when failedAttempts is %i (newCount < %i)',
                async (currentAttempts) => {
                    const user = makeUser({ failedAttempts: currentAttempts });
                    mockPrismaUser.update.mockResolvedValue(
                        makeUser({ failedAttempts: currentAttempts + 1 }),
                    );

                    await service.recordFailedAttempt(user);

                    const data = mockPrismaUser.update.mock.calls[0]?.[0]?.data as Prisma.UserUpdateInput;
                    expect(data.status).toBeUndefined();
                },
            );
        });

        describe('at the lockout threshold (5th failed attempt)', () => {
            it('sets status to LOCKED', async () => {
                const user = makeUser({ failedAttempts: MAX_FAILED_ATTEMPTS - 1 });
                mockPrismaUser.update.mockResolvedValue(
                    makeUser({ failedAttempts: 5, status: UserStatus.LOCKED }),
                );

                await service.recordFailedAttempt(user);

                const data = mockPrismaUser.update.mock.calls[0]?.[0]?.data as Prisma.UserUpdateInput;
                expect(data.status).toBe(UserStatus.LOCKED);
            });

            it('sets lockedUntil ~15 minutes in the future', async () => {
                const before = Date.now();
                const user = makeUser({ failedAttempts: MAX_FAILED_ATTEMPTS - 1 });
                mockPrismaUser.update.mockResolvedValue(makeUser());

                await service.recordFailedAttempt(user);

                const after = Date.now();
                const data = mockPrismaUser.update.mock.calls[0]?.[0]?.data as Prisma.UserUpdateInput;

                const lockedUntil = data.lockedUntil as Date;
                expect(lockedUntil).toBeInstanceOf(Date);

                const expectedMin = before + LOCKOUT_DURATION_MINUTES * 60 * 1000;
                const expectedMax = after + LOCKOUT_DURATION_MINUTES * 60 * 1000;
                expect(lockedUntil.getTime()).toBeGreaterThanOrEqual(expectedMin);
                expect(lockedUntil.getTime()).toBeLessThanOrEqual(expectedMax);
            });

            it('returns the updated user from Prisma', async () => {
                const user = makeUser({ failedAttempts: MAX_FAILED_ATTEMPTS - 1 });
                const lockedUser = makeUser({
                    failedAttempts: 5,
                    status: UserStatus.LOCKED,
                    lockedUntil: inMinutes(15),
                });
                mockPrismaUser.update.mockResolvedValue(lockedUser);

                const result = await service.recordFailedAttempt(user);

                expect(result).toEqual(lockedUser);
            });
        });

        describe('beyond the threshold (already exceeded)', () => {
            it('still locks when failedAttempts is already >= threshold', async () => {
                const user = makeUser({ failedAttempts: MAX_FAILED_ATTEMPTS });
                mockPrismaUser.update.mockResolvedValue(makeUser());

                await service.recordFailedAttempt(user);

                const data = mockPrismaUser.update.mock.calls[0]?.[0]?.data as Prisma.UserUpdateInput;
                expect(data.status).toBe(UserStatus.LOCKED);
                expect(data.failedAttempts).toBe(MAX_FAILED_ATTEMPTS + 1);
            });
        });
    });

    // -------------------------------------------------------------------------
    // resetFailedAttempts
    // -------------------------------------------------------------------------

    describe('resetFailedAttempts()', () => {
        describe('permanently locked account (isLocked = true)', () => {
            it('throws ForbiddenException without touching Prisma', async () => {
                const user = makeUser({ isLocked: true });

                await expect(service.resetFailedAttempts(user)).rejects.toThrow(
                    ForbiddenException,
                );
                expect(mockPrismaUser.update).not.toHaveBeenCalled();
            });

            it('message mentions contacting an administrator', async () => {
                const user = makeUser({ isLocked: true });

                await expect(service.resetFailedAttempts(user)).rejects.toThrow(
                    /administrator/i,
                );
            });
        });

        describe('timed lockout — still active', () => {
            it('throws ForbiddenException when lockedUntil is in the future', async () => {
                const user = makeUser({ lockedUntil: inMinutes(10) });

                await expect(service.resetFailedAttempts(user)).rejects.toThrow(
                    ForbiddenException,
                );
                expect(mockPrismaUser.update).not.toHaveBeenCalled();
            });

            it('message tells user to try again later', async () => {
                const user = makeUser({ lockedUntil: inMinutes(5) });

                await expect(service.resetFailedAttempts(user)).rejects.toThrow(
                    /try again later/i,
                );
            });
        });

        describe('timed lockout — expired', () => {
            it('resets the account when lockedUntil is in the past', async () => {
                const user = makeUser({ lockedUntil: minutesAgo(1) });
                mockPrismaUser.update.mockResolvedValue(undefined as unknown as User);

                await service.resetFailedAttempts(user);

                expect(mockPrismaUser.update).toHaveBeenCalledWith({
                    where: { id: user.id },
                    data: {
                        failedAttempts: 0,
                        lockedUntil: null,
                        isLocked: false,
                        status: UserStatus.ACTIVE,
                    },
                });
            });
        });

        describe('clean account (no lockout)', () => {
            it('resets counters without throwing', async () => {
                const user = makeUser();
                mockPrismaUser.update.mockResolvedValue(undefined as unknown as User);

                await expect(service.resetFailedAttempts(user)).resolves.toBeUndefined();

                expect(mockPrismaUser.update).toHaveBeenCalledWith({
                    where: { id: user.id },
                    data: {
                        failedAttempts: 0,
                        lockedUntil: null,
                        isLocked: false,
                        status: UserStatus.ACTIVE,
                    },
                });
            });
        });
    });

    // -------------------------------------------------------------------------
    // remainingLockoutSeconds
    // -------------------------------------------------------------------------

    describe('remainingLockoutSeconds()', () => {
        it('returns null when lockedUntil is null', () => {
            const user = makeUser({ lockedUntil: null });
            expect(service.remainingLockoutSeconds(user)).toBeNull();
        });

        it('returns null when lockedUntil is in the past', () => {
            const user = makeUser({ lockedUntil: minutesAgo(5) });
            expect(service.remainingLockoutSeconds(user)).toBeNull();
        });

        it('returns a positive integer when lockedUntil is in the future', () => {
            const user = makeUser({ lockedUntil: inMinutes(10) });
            const seconds = service.remainingLockoutSeconds(user);

            expect(seconds).not.toBeNull();
            expect(seconds).toBeGreaterThan(0);

            expect(seconds!).toBeLessThanOrEqual(10 * 60);
            expect(seconds!).toBeGreaterThanOrEqual(10 * 60 - 2);
        });

        it('rounds up partial seconds (Math.ceil)', () => {
            const user = makeUser({
                lockedUntil: new Date(Date.now() + 1500),
            });
            const seconds = service.remainingLockoutSeconds(user);
            expect(seconds).toBe(2);
        });
    });
});