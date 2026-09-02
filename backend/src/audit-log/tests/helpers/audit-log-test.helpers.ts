import { Test, TestingModule } from '@nestjs/testing'
import { Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditLogService, AuditLogEntry } from '../../services/audit-log.service';
import { PrismaService } from '../../../prisma/prisma.service';

export function createMockAuditLog() {
    return {create: jest.fn()};
}

export function createMockPrismaService(mockAuditLog: ReturnType<typeof createMockAuditLog>) {
    return { auditLog: mockAuditLog};
}

export function makeEntry(override: Partial<AuditLogEntry> = {}): AuditLogEntry {
    return {
        action: AuditAction.PLACEMENT_CREATED,
        actingUserId: 'user-1',
        entityType: 'Placement',
        entityId: 'placement-1',
        metadata: { project: 'project-1'},
        ...override,
    }
}

export async function setupAuditLogServiceTest(mockPrisma: object): Promise<{
    service: AuditLogService;
    loggerErrorSpy: jest.SpyInstance;
}> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            AuditLogService,
            { provide: PrismaService, useValue: mockPrisma},
        ],
    }).compile();

    const service = module.get<AuditLogService>(AuditLogService);
    const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

    return { service, loggerErrorSpy };
}