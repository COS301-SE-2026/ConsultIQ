import { Test, TestingModule } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { CredentialService } from '../../services/auth.credential.service';
import { PrismaService } from '../../../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpassword',
    status: UserStatus.ACTIVE,
    isLocked: false,
    lockedUntil: null,
    ...overrides,
  };
}

const inMinutes = (m: number) => new Date(Date.now() + m * 60 * 1000);
const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrismaUser = { findUnique: jest.fn() };
const mockPrisma = { user: mockPrismaUser };

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<
  typeof bcrypt.compare
>;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CredentialService', () => {
  let service: CredentialService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CredentialService>(CredentialService);
  });

  // -------------------------------------------------------------------------
  // findUserByEmail
  // -------------------------------------------------------------------------

  describe('findUserByEmail()', () => {
    it('queries Prisma with lowercased, trimmed email', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await service.findUserByEmail('  TEST@Example.COM  ');

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('returns the user when found', async () => {
      const user = makeUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.findUserByEmail('test@example.com');

      expect(result).toEqual(user);
    });

    it('returns null when not found', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const result = await service.findUserByEmail('ghost@example.com');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // validateCredentials — USER_NOT_FOUND
  // -------------------------------------------------------------------------

  describe('validateCredentials() — USER_NOT_FOUND', () => {
    beforeEach(() => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      // dummy compare resolves 
      mockBcryptCompare.mockResolvedValue(false as never);
    });

    it('returns USER_NOT_FOUND when email does not exist', async () => {
      const result = await service.validateCredentials(
        'ghost@example.com',
        'password',
      );

      expect(result.outcome).toBe('USER_NOT_FOUND');
    });

    it('still calls bcrypt.compare (dummy) to prevent timing attacks', async () => {
      await service.validateCredentials('ghost@example.com', 'password');

      expect(mockBcryptCompare).toHaveBeenCalledTimes(1);
    });

    it('does not call bcrypt.compare with the real password', async () => {
      await service.validateCredentials('ghost@example.com', 'my-real-secret');

      const [pwd] = mockBcryptCompare.mock.calls[0];
      expect(pwd).not.toBe('my-real-secret');
    });
  });

  // -------------------------------------------------------------------------
  // validateCredentials — status guards
  // -------------------------------------------------------------------------

  describe('validateCredentials() — ACCOUNT_PENDING', () => {
    it('returns ACCOUNT_PENDING without checking password', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(
        makeUser({ status: UserStatus.PENDING }),
      );

      const result = await service.validateCredentials(
        'test@example.com',
        'password',
      );

      expect(result.outcome).toBe('ACCOUNT_PENDING');
      expect(mockBcryptCompare).not.toHaveBeenCalled();
    });

    it('includes the user in the result', async () => {
      const user = makeUser({ status: UserStatus.PENDING });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.validateCredentials(
        'test@example.com',
        'password',
      );

      expect(result).toMatchObject({ outcome: 'ACCOUNT_PENDING', user });
    });
  });

  describe('validateCredentials() — ACCOUNT_SUSPENDED', () => {
    it('returns ACCOUNT_SUSPENDED without checking password', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(
        makeUser({ status: UserStatus.SUSPENDED }),
      );

      const result = await service.validateCredentials(
        'test@example.com',
        'password',
      );

      expect(result.outcome).toBe('ACCOUNT_SUSPENDED');
      expect(mockBcryptCompare).not.toHaveBeenCalled();
    });

    it('includes the user in the result', async () => {
      const user = makeUser({ status: UserStatus.SUSPENDED });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.validateCredentials(
        'test@example.com',
        'password',
      );

      expect(result).toMatchObject({ outcome: 'ACCOUNT_SUSPENDED', user });
    });
  });

  // -------------------------------------------------------------------------
  // validateCredentials — ACCOUNT_LOCKED
  // -------------------------------------------------------------------------

  describe('validateCredentials() — ACCOUNT_LOCKED', () => {
    it('returns ACCOUNT_LOCKED when isLocked is true', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(makeUser({ isLocked: true }));

      const result = await service.validateCredentials(
        'test@example.com',
        'password',
      );

      expect(result.outcome).toBe('ACCOUNT_LOCKED');
      expect(mockBcryptCompare).not.toHaveBeenCalled();
    });

    it('returns ACCOUNT_LOCKED when lockedUntil is in the future', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(
        makeUser({ lockedUntil: inMinutes(10) }),
      );

      const result = await service.validateCredentials(
        'test@example.com',
        'password',
      );

      expect(result.outcome).toBe('ACCOUNT_LOCKED');
      expect(mockBcryptCompare).not.toHaveBeenCalled();
    });

    it('does NOT lock when lockedUntil is in the past (expired timed lockout)', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(
        makeUser({ lockedUntil: minutesAgo(5) }),
      );
      mockBcryptCompare.mockResolvedValue(true as never);

      const result = await service.validateCredentials(
        'test@example.com',
        'correct-password',
      );

      expect(result.outcome).not.toBe('ACCOUNT_LOCKED');
    });

    it('includes the user in the result', async () => {
      const user = makeUser({ isLocked: true });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.validateCredentials(
        'test@example.com',
        'password',
      );

      expect(result).toMatchObject({ outcome: 'ACCOUNT_LOCKED', user });
    });
  });

  // -------------------------------------------------------------------------
  // validateCredentials — FAILED_PASSWORD
  // -------------------------------------------------------------------------

  describe('validateCredentials() — FAILED_PASSWORD', () => {
    it('returns FAILED_PASSWORD when bcrypt.compare returns false', async () => {
      const user = makeUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(false as never);

      const result = await service.validateCredentials(
        'test@example.com',
        'wrong-password',
      );

      expect(result.outcome).toBe('FAILED_PASSWORD');
    });

    it('calls bcrypt.compare with the plain password and stored hash', async () => {
      const user = makeUser({ passwordHash: '$2b$12$somehash' });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(false as never);

      await service.validateCredentials('test@example.com', 'wrong-password');

      expect(mockBcryptCompare).toHaveBeenCalledWith(
        'wrong-password',
        '$2b$12$somehash',
      );
    });

    it('includes the user in the result', async () => {
      const user = makeUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(false as never);

      const result = await service.validateCredentials(
        'test@example.com',
        'wrong-password',
      );

      expect(result).toMatchObject({ outcome: 'FAILED_PASSWORD', user });
    });
  });

  // -------------------------------------------------------------------------
  // validateCredentials — SUCCESS
  // -------------------------------------------------------------------------

  describe('validateCredentials() — SUCCESS', () => {
    it('returns SUCCESS when password matches', async () => {
      const user = makeUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(true as never);

      const result = await service.validateCredentials(
        'test@example.com',
        'correct-password',
      );

      expect(result.outcome).toBe('SUCCESS');
    });

    it('includes the user in the result', async () => {
      const user = makeUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(true as never);

      const result = await service.validateCredentials(
        'test@example.com',
        'correct-password',
      );

      expect(result).toMatchObject({ outcome: 'SUCCESS', user });
    });

    it('calls bcrypt.compare exactly once with correct args', async () => {
      const user = makeUser({ passwordHash: '$2b$12$realhash' });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(true as never);

      await service.validateCredentials('test@example.com', 'correct-password');

      expect(mockBcryptCompare).toHaveBeenCalledTimes(1);
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        'correct-password',
        '$2b$12$realhash',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Guard ordering — status checked before lockout, lockout before password
  // -------------------------------------------------------------------------

  describe('guard ordering', () => {
    it('checks PENDING before lockout state', async () => {
      // A PENDING + locked user — should get ACCOUNT_PENDING, not ACCOUNT_LOCKED
      mockPrismaUser.findUnique.mockResolvedValue(
        makeUser({ status: UserStatus.PENDING, isLocked: true }),
      );

      const result = await service.validateCredentials(
        'test@example.com',
        'password',
      );

      expect(result.outcome).toBe('ACCOUNT_PENDING');
    });

    it('checks SUSPENDED before lockout state', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(
        makeUser({ status: UserStatus.SUSPENDED, isLocked: true }),
      );

      const result = await service.validateCredentials(
        'test@example.com',
        'password',
      );

      expect(result.outcome).toBe('ACCOUNT_SUSPENDED');
    });

    it('checks lockout before bcrypt (skips password check when locked)', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(makeUser({ isLocked: true }));

      await service.validateCredentials('test@example.com', 'any-password');

      expect(mockBcryptCompare).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // isCurrentlyLocked
  // -------------------------------------------------------------------------

  describe('isCurrentlyLocked()', () => {
    it('returns true when isLocked is true', () => {
      expect(
        service.isCurrentlyLocked(makeUser({ isLocked: true }) as any),
      ).toBe(true);
    });

    it('returns true when lockedUntil is in the future', () => {
      expect(
        service.isCurrentlyLocked(
          makeUser({ lockedUntil: inMinutes(5) }) as any,
        ),
      ).toBe(true);
    });

    it('returns false when lockedUntil is in the past', () => {
      expect(
        service.isCurrentlyLocked(
          makeUser({ lockedUntil: minutesAgo(5) }) as any,
        ),
      ).toBe(false);
    });

    it('returns false when lockedUntil is null and isLocked is false', () => {
      expect(service.isCurrentlyLocked(makeUser() as any)).toBe(false);
    });

    it('returns true for isLocked=true even when lockedUntil is in the past', () => {
      // Permanent admin lock takes precedence over expired timed lockout
      expect(
        service.isCurrentlyLocked(
          makeUser({ isLocked: true, lockedUntil: minutesAgo(10) }) as any,
        ),
      ).toBe(true);
    });
  });
});
