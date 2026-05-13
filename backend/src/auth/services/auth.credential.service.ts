import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// TASK-12  — Credential validation service
// TASK-12b — SELECT query to fetch the user record and hash by email

export type CredentialCheckResult =
  | { outcome: 'USER_NOT_FOUND' }
  | { outcome: 'ACCOUNT_PENDING'; user: User }
  | { outcome: 'ACCOUNT_SUSPENDED'; user: User }
  | { outcome: 'ACCOUNT_LOCKED'; user: User }
  | { outcome: 'FAILED_PASSWORD'; user: User }
  | { outcome: 'SUCCESS'; user: User };

@Injectable()
export class CredentialService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * TASK-12b — Fetch user record by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * TASK-12 — Full credential validation pipeline.
   */
  async validateCredentials(
    email: string,
    plainPassword: string,
  ): Promise<CredentialCheckResult> {
    const user = await this.findUserByEmail(email);

    //  1. Unknown email
    if (!user) {
      // Perform a dummy bcrypt compare to prevent timing-based user enumeration.
      await this.dummyCompare();
      return { outcome: 'USER_NOT_FOUND' };
    }

    //  2. Status guards
    if (user.status === UserStatus.PENDING) {
      return { outcome: 'ACCOUNT_PENDING', user };
    }

    if (user.status === UserStatus.SUSPENDED) {
      return { outcome: 'ACCOUNT_SUSPENDED', user };
    }

    //  3. Lockout state
    if (this.isCurrentlyLocked(user)) {
      return { outcome: 'ACCOUNT_LOCKED', user };
    }

    //  4. bcrypt password comparison
    const passwordMatches = await bcrypt.compare(
      plainPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return { outcome: 'FAILED_PASSWORD', user };
    }

    return { outcome: 'SUCCESS', user };
  }

  isCurrentlyLocked(user: User): boolean {
    if (user.isLocked) {
      return true;
    } else if (user.lockedUntil && user.lockedUntil > new Date()) return true;
    else {
      return false;
    }
  }

  //Helper method to perform a dummy bcrypt compare for non-existent users to mitigate timing attacks.
  private async dummyCompare(): Promise<void> {
    const dummyHash =
      '$2b$12$KIXJz6JzY6JzY6JzY6JzYeKIXJz6JzY6JzY6JzY6JzY6JzY6JzYe';
    await bcrypt.compare('dummy-password', dummyHash).catch(() => false);
  }
}
