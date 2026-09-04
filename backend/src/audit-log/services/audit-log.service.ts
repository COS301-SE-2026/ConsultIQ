import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogEntry {
  action: AuditAction;
  actingUserId: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          actingUserId: entry.actingUserId,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: entry.metadata ?? undefined,
        },
      });
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error(String(err));

      this.logger.error(
        `Failed to write audit log [${entry.action}] for ${entry.entityType} ${entry.entityId}: ${error.message}`,
        error.stack,
      );
    }
  }
}