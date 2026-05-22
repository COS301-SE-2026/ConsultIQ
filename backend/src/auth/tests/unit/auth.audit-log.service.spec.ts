import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditOutcome } from '@prisma/client';

import {
  AuditLogService,
  AuditContext,
} from '../../services/auth.audit-log.service';
import { PrismaService } from '../../../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<AuditContext> = {}): AuditContext {
  return {
    email: 'test@example.com',
    outcome: AuditOutcome.SUCCESS,
    userId: 'user-1',
    ipAddress: '127.0.0.1',
    userAgent: 'jest-agent',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuthAuditLog = { create: jest.fn() };
const mockPrisma = { authAuditLog: mockAuthAuditLog };

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AuditLogService', () => {
  let service: AuditLogService;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);

    // NestJS logger so error output doesn't pollute test runs
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Happy path — Prisma write succeeds
  // -------------------------------------------------------------------------

  describe('successful write', () => {
    beforeEach(() => {
      mockAuthAuditLog.create.mockResolvedValue(undefined);
    });

    it('resolves without throwing', async () => {
      await expect(service.log(makeCtx())).resolves.toBeUndefined();
    });

    it('calls prisma.authAuditLog.create exactly once', async () => {
      await service.log(makeCtx());
      expect(mockAuthAuditLog.create).toHaveBeenCalledTimes(1);
    });

    it('passes lowercased, trimmed email to Prisma', async () => {
      await service.log(makeCtx({ email: '  UPPER@Example.COM  ' }));

      expect(mockAuthAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'upper@example.com' }),
        }),
      );
    });

    it('persists the correct outcome', async () => {
      await service.log(makeCtx({ outcome: AuditOutcome.FAILED_PASSWORD }));

      expect(mockAuthAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            outcome: AuditOutcome.FAILED_PASSWORD,
          }),
        }),
      );
    });

    it('passes userId when provided', async () => {
      await service.log(makeCtx({ userId: 'user-42' }));

      expect(mockAuthAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-42' }),
        }),
      );
    });

    it('passes ipAddress when provided', async () => {
      await service.log(makeCtx({ ipAddress: '203.0.113.5' }));

      expect(mockAuthAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ipAddress: '203.0.113.5' }),
        }),
      );
    });

    it('passes userAgent when provided', async () => {
      await service.log(makeCtx({ userAgent: 'Mozilla/5.0' }));

      expect(mockAuthAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userAgent: 'Mozilla/5.0' }),
        }),
      );
    });

    it('sends the full data payload with all fields', async () => {
      const ctx = makeCtx();
      await service.log(ctx);

      expect(mockAuthAuditLog.create).toHaveBeenCalledWith({
        data: {
          email: ctx.email,
          outcome: ctx.outcome,
          userId: ctx.userId,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Optional field defaults
  // -------------------------------------------------------------------------

  describe('optional field defaults', () => {
    beforeEach(() => {
      mockAuthAuditLog.create.mockResolvedValue(undefined);
    });

    it('defaults userId to null when omitted', async () => {
      await service.log(makeCtx({ userId: undefined }));

      expect(mockAuthAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: null }),
        }),
      );
    });

    it('defaults ipAddress to "0.0.0.0" when omitted', async () => {
      await service.log(makeCtx({ ipAddress: undefined }));

      expect(mockAuthAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ipAddress: '0.0.0.0' }),
        }),
      );
    });

    it('defaults userAgent to null when omitted', async () => {
      await service.log(makeCtx({ userAgent: undefined }));

      expect(mockAuthAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userAgent: null }),
        }),
      );
    });

    it('applies all defaults simultaneously when all optional fields are omitted', async () => {
      await service.log({
        email: 'min@example.com',
        outcome: AuditOutcome.USER_NOT_FOUND,
      });

      expect(mockAuthAuditLog.create).toHaveBeenCalledWith({
        data: {
          email: 'min@example.com',
          outcome: AuditOutcome.USER_NOT_FOUND,
          userId: null,
          ipAddress: '0.0.0.0',
          userAgent: null,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Error handling — Prisma write fails
  // -------------------------------------------------------------------------

  describe('when Prisma throws', () => {
    const dbError = new Error('Connection lost');

    beforeEach(() => {
      mockAuthAuditLog.create.mockRejectedValue(dbError);
    });

    it('does NOT rethrow — resolves silently', async () => {
      await expect(service.log(makeCtx())).resolves.toBeUndefined();
    });

    it('logs an error via Logger.error', async () => {
      await service.log(makeCtx());
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('error message contains the outcome', async () => {
      await service.log(makeCtx({ outcome: AuditOutcome.ACCOUNT_LOCKED }));

      const [message] = loggerErrorSpy.mock.calls[0];
      expect(message).toContain('ACCOUNT_LOCKED');
    });

    it('error message contains the email', async () => {
      await service.log(makeCtx({ email: 'victim@example.com' }));

      const [message] = loggerErrorSpy.mock.calls[0];
      expect(message).toContain('victim@example.com');
    });

    it('error message contains the underlying error message', async () => {
      await service.log(makeCtx());

      const [message] = loggerErrorSpy.mock.calls[0];
      expect(message).toContain('Connection lost');
    });

    it('passes the error stack as the second argument to Logger.error', async () => {
      await service.log(makeCtx());

      const [, stack] = loggerErrorSpy.mock.calls[0];
      expect(stack).toBe(dbError.stack);
    });

    it('still calls Prisma.create before catching — does not short-circuit', async () => {
      await service.log(makeCtx());
      expect(mockAuthAuditLog.create).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // All AuditOutcome values are persisted correctly
  // -------------------------------------------------------------------------

  describe('outcome enum coverage', () => {
    beforeEach(() => {
      mockAuthAuditLog.create.mockResolvedValue(undefined);
    });

    const outcomes = Object.values(AuditOutcome);

    it.each(outcomes)(
      'persists outcome %s without throwing',
      async (outcome) => {
        await expect(
          service.log(makeCtx({ outcome })),
        ).resolves.toBeUndefined();

        expect(mockAuthAuditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ outcome }),
          }),
        );
      },
    );
  });
});
