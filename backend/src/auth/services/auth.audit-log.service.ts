import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditOutcome } from '@prisma/client';

export interface AuditContext {
    email: string;
    outcome: AuditOutcome;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditLogService {
    private readonly logger = new Logger(AuditLogService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Persists an audit record for every login attempt.
     */
    async log(ctx: AuditContext): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    email: ctx.email.toLowerCase().trim(),
                    outcome: ctx.outcome,
                    userId: ctx.userId ?? null,
                    ipAddress: ctx.ipAddress ?? "0.0.0.0",
                    userAgent: ctx.userAgent ?? null,
                },
            });
        } catch (err) {

            const error = err as Error;
            this.logger.error(
                `Failed to write audit log [${ctx.outcome}] for ${ctx.email}: ${error.message}`,
                error.stack,
            );
        }
    }
}