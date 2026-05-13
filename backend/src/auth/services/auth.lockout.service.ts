import { Injectable } from '@nestjs/common';
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
        let lockedUntil: Date | undefined = undefined;

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


}