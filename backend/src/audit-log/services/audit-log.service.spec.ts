import { AuditAction } from '@prisma/client';
import { AuditLogService } from './audit-log.service';
import {
  createMockAuditLog,
  createMockPrismaService,
  makeEntry,
  setupAuditLogServiceTest,
} from '../tests/helpers/audit-log-test.helpers';

const mockAuditLog = createMockAuditLog();
const mockPrisma = createMockPrismaService(mockAuditLog);

describe('AuditLogService', () => {
  let service: AuditLogService;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ service, loggerErrorSpy } = await setupAuditLogServiceTest(mockPrisma));
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

    it.each<[string, unknown]>([
      ['action', AuditAction.CV_EXTRACTED],
      ['actingUserId', 'user-42'],
      ['entityType', 'CvFile'],
      ['entityId', 'cv-99'],
      ['metadata', { consultantId: 'consultant-1', allocation: 50 }],
    ])('passes %s through to prisma.auditLog.create', async (field, value) => {
      await service.log(makeEntry({ [field]: value } as any));

      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ [field]: value }) }),
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
        expect.objectContaining({ data: expect.objectContaining({ metadata: undefined }) }),
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
      await service.log(makeEntry({ action: AuditAction.PLACEMENT_CANCELLED, entityType: 'CvFile', entityId: 'cv-77' }));
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

    it.each(Object.values(AuditAction))('persists action %s without throwing', async (action) => {
      await expect(service.log(makeEntry({ action }))).resolves.toBeUndefined();
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action }) }),
      );
    });
  });
});