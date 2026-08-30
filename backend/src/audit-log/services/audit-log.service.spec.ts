import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

import { AuditLogService, AuditLogEntry } from './audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    action: AuditAction.PLACEMENT_CREATED,
    actingUserId: 'user-1',
    entityType: 'Placement',
    entityId: 'placement-1',
    metadata: { projectId: 'project-1' },
    ...overrides,
  };
}

const mockAuditLog = { create: jest.fn() };
const mockPrisma = { auditLog: mockAuditLog };

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

    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });



  describe('successful write', () => {
    beforeEach(() => {
      mockAuditLog.create.mockResolvedValue(undefined);
    });

    it('resolves without throwing', async () => {
      await expect(service.log(makeEntry())).resolves.toBeUndefined();
    });

    it('calls prisma.auditLog.create exactly once', async () => {
      await service.log(makeEntry());
      expect(mockAuditLog.create).toHaveBeenCalledTimes(1);
    });

    it('persists the correct action', async () => {
      await service.log(makeEntry({ action: AuditAction.CV_EXTRACTED }));

      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: AuditAction.CV_EXTRACTED }),
        }),
      );
    });

    it('persists the acting user id', async () => {
      await service.log(makeEntry({ actingUserId: 'user-42' }));

      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ actingUserId: 'user-42' }),
        }),
      );
    });

    it('persists the entity type and entity id', async () => {
      await service.log(
        makeEntry({ entityType: 'CvFile', entityId: 'cv-99' }),
      );

      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'CvFile',
            entityId: 'cv-99',
          }),
        }),
      );
    });

    it('passes metadata through unchanged when provided', async () => {
      const metadata = { consultantId: 'consultant-1', allocation: 50 };
      await service.log(makeEntry({ metadata }));

      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ metadata }),
        }),
      );
    });

    it('sends the full data payload with all fields', async () => {
      const entry = makeEntry();
      await service.log(entry);

      expect(mockAuditLog.create).toHaveBeenCalledWith({
        data: {
          action: entry.action,
          actingUserId: entry.actingUserId,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: entry.metadata,
        },
      });
    });
  });

  describe('optional field defaults', () => {
    beforeEach(() => {
      mockAuditLog.create.mockResolvedValue(undefined);
    });

    it('defaults metadata to undefined when omitted', async () => {
      await service.log(makeEntry({ metadata: undefined }));

      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ metadata: undefined }),
        }),
      );
    });
  });

  // ------------ Error handling --------------------------

  describe('when Prisma throws', () => {
    const dbError = new Error('Connection lost');

    beforeEach(() => {
      mockAuditLog.create.mockRejectedValue(dbError);
    });

    it('does NOT rethrow — resolves silently (append-only writes must never break the calling operation)', async () => {
      await expect(service.log(makeEntry())).resolves.toBeUndefined();
    });

    it('logs an error via Logger.error', async () => {
      await service.log(makeEntry());
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('error message contains the action', async () => {
      await service.log(makeEntry({ action: AuditAction.PLACEMENT_CANCELLED }));

      const [message] = loggerErrorSpy.mock.calls[0];
      expect(message).toContain('PLACEMENT_CANCELLED');
    });

    it('error message contains the entity type and id', async () => {
      await service.log(
        makeEntry({ entityType: 'CvFile', entityId: 'cv-77' }),
      );

      const [message] = loggerErrorSpy.mock.calls[0];
      expect(message).toContain('CvFile');
      expect(message).toContain('cv-77');
    });

    it('error message contains the underlying error message', async () => {
      await service.log(makeEntry());

      const [message] = loggerErrorSpy.mock.calls[0];
      expect(message).toContain('Connection lost');
    });

    it('passes the error stack as the second argument to Logger.error', async () => {
      await service.log(makeEntry());

      const [, stack] = loggerErrorSpy.mock.calls[0];
      expect(stack).toBe(dbError.stack);
    });

    it('still calls Prisma.create before catching — does not short-circuit', async () => {
      await service.log(makeEntry());
      expect(mockAuditLog.create).toHaveBeenCalledTimes(1);
    });
  });


  // ------------ All AuditAction values are persisted correctly ------------- 


  describe('action enum coverage', () => {
    beforeEach(() => {
      mockAuditLog.create.mockResolvedValue(undefined);
    });

    const actions = Object.values(AuditAction);

    it.each(actions)('persists action %s without throwing', async (action) => {
      await expect(
        service.log(makeEntry({ action })),
      ).resolves.toBeUndefined();

      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action }),
        }),
      );
    });
  });
});