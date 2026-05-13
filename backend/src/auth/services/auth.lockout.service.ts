import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, User, UserStatus } from '@prisma/client';


// TASK-13  - Account lockout logic (increment counter, lock after 5 attempts)
// TASK-13b - UPDATE query to increment failed_attempts and store lockout_until

/** Max fail attempts */
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Plan:
 *      locked accounts require an Admin to manually
 *      unlock (isLocked = true, no automatic expiry).
 *
 */

// TODO: Update the timeout to null for admin lockouts
// Time-based lockout duration 15min after five failed attempts for admin, initail implementation
const LOCKOUT_DURATION_MINUTES: number | null = 15;

@Injectable()
export class LockoutService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Called after every failed password attempt.
     * Increments the counter and locks the account when the threshold is hit.
     *
     * Returns the updated user record.
     */
    async recordFailedAttempt(user: User): Promise<User> {
        const newCount = user.failedAttempts + 1;
        const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;

        // Build the lockout timestamp 
        let lockedUntil: Date | null = null;

        if (shouldLock && LOCKOUT_DURATION_MINUTES) {
            const millisecondsToAdd = LOCKOUT_DURATION_MINUTES * 60 * 1000;
            lockedUntil = new Date(Date.now() + millisecondsToAdd);
        }
        // UPDATE query
        // 1. Update failed attempts counter
        const updateData: Prisma.UserUpdateInput = {
            failedAttempts: newCount,
        };

        // 2. Update lockout status if threshold is hit
        if (shouldLock) {
            updateData.status = UserStatus.LOCKED;

            // 15-minute lockout
            if (LOCKOUT_DURATION_MINUTES !== null) {
                updateData.lockedUntil = lockedUntil;
            }

            else {
                updateData.isLocked = true;
            }
        }

        // Execute query and return updated user
        const updated = await this.prisma.user.update({
            where: { id: user.id },
            data: updateData,
        });

        return updated;
    }


    /**
 * TASK-13b — Reset failed-attempt counter on successful login.
 * Also clears any timed lockout that may have naturally expired.
 */

    // Currently reset failed attempts only when the user tries to login after the lockout duration has expired.
    async resetFailedAttempts(user: User): Promise<void> {

        // If account is locked without a timeout
        if (user.isLocked) {
            throw new ForbiddenException(
                'Your account is currently locked. Contanct an Administrator.',
            );
        }

        const isTimedOutLockoutExpired = user.lockedUntil && user.lockedUntil > new Date();
        // Still locked due to active timeout
        if (isTimedOutLockoutExpired) {
            throw new ForbiddenException(
                'Your account is temporarily locked. Please try again later.',

            );
        }

        //Expired timeout - Able to Login
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                failedAttempts: 0,
                lockedUntil: null,
                isLocked: false,
                status: UserStatus.ACTIVE,
            },
        });
    }

    /**
 * Admin action — unlock an account and reset the counter.
 */
    async unlockAccount(userId: string): Promise<User> {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                isLocked: false,
                lockedUntil: null,
                failedAttempts: 0,
                status: UserStatus.ACTIVE,
            },
        });
    }

    /**
 * Admin action — locks an account.
 */
    async lockAccount(userId: string): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                isLocked: true,
                lockedUntil: null,
                status: UserStatus.LOCKED,
            },
        });
    }


}