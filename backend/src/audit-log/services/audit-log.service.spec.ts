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

    it('resolves without throwing and writes exactly once', async () => {
      await expect(service.log(makeEntry())).resolves.toBeUndefined();
      expect(mockAuditLog.create).toHaveBeenCalledTimes(1);
    });

    // Table-driven: each row checks that a single field on the entry ends
    // up in the exact same spot in the Prisma `data` payload.
    it.each<[keyof AuditLogEntry, unknown]>([
      ['action', AuditAction.CV_EXTRACTED],
      ['actingUserId', 'user-42'],
      ['entityType', 'CvFile'],
      ['entityId', 'cv-99'],
      ['metadata', { consultantId: 'consultant-1', allocation: 50 }],
    ])('passes %s through to prisma.auditLog.create', async (field, value) => {
      await service.log(makeEntry({ [field]: value } as Partial<AuditLogEntry>));

      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ [field]: value }),
        }),
      );
    });

    it('sends the full data payload with all fields, unmodified', async () => {
      const entry = makeEntry();
      await service.log(entry);

      expect(mockAuditLog.create).toHaveBeenCalledWith({ data: { ...entry } });
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

  describe('when Prisma throws', () => {
    const dbError = new Error('Connection lost');

    beforeEach(() => {
      mockAuditLog.create.mockRejectedValue(dbError);
    });

    it('does not rethrow, still calls create, and logs via Logger.error with the stack', async () => {
      await expect(service.log(makeEntry())).resolves.toBeUndefined();

      expect(mockAuditLog.create).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);

      const [message, stack] = loggerErrorSpy.mock.calls[0];
      expect(stack).toBe(dbError.stack);
      expect(message).toContain('Connection lost');
    });

    it('includes the action and entity identifiers in the error message', async () => {
      await service.log(
        makeEntry({
          action: AuditAction.PLACEMENT_CANCELLED,
          entityType: 'CvFile',
          entityId: 'cv-77',
        }),
      );

      const [message] = loggerErrorSpy.mock.calls[0];
      expect(message).toContain('PLACEMENT_CANCELLED');
      expect(message).toContain('CvFile');
      expect(message).toContain('cv-77');
    });
  });

  describe('action enum coverage', () => {
    beforeEach(() => {
      mockAuditLog.create.mockResolvedValue(undefined);
    });

    it.each(Object.values(AuditAction))(
      'persists action %s without throwing',
      async (action) => {
        await expect(
          service.log(makeEntry({ action })),
        ).resolves.toBeUndefined();

        expect(mockAuditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ action }) }),
        );
      },
    );
  });
});