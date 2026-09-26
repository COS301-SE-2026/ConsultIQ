import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService, CommitResult } from './week.service';
import { TimeService, LocalDate } from './time.service';
import { Change, ValidateContext } from '../dto/scheduler.dto';
import { IdempotencyKeyType } from '@prisma/client';


export interface VoidResult {
    ok: boolean;
    message?: string;
}

@Injectable()
export class RolloverService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly weekService: WeekService,
        private readonly timeService: TimeService,
    ) { }


    public async rollover(
        taskId: string,
        fromSlotId: string,
        expectedVersion?: number,
    ): Promise<CommitResult> {
        const idempotencyKey = `rollover:${taskId}:${fromSlotId}`;
        await this.checkAndLockIdempotency(idempotencyKey);

        try {

            const dbSlot = await this.prisma.schedulerSlot.findUnique({
                where: { id: fromSlotId },
                include: { week: true },
            });

            if (!dbSlot) {
                throw new NotFoundException(`Slot ${fromSlotId} not found`);
            }

            const consultantId = dbSlot.week.consultantId;
            const weekStart = dbSlot.week.weekStart.toISOString().split('T')[0] as LocalDate;

            const week = await this.weekService.getWeek(consultantId, weekStart);

            const window = this.timeService.restOfDayWindow(dbSlot.start.toISOString(), week.timezone);

            const change: Change = {
                type: 'rollover',
                taskId,
                fromSlotId,
                origin: 'system',
                window,
            } as Change;

            const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };

            const result = await this.weekService.commit(week, change, ctx, expectedVersion);

            if (!result.ok) {
                await this.releaseIdempotency(idempotencyKey);
            }

            return result;
        } catch (error) {
            await this.releaseIdempotency(idempotencyKey);
            throw error;
        }
    }

    // -----------------------------------------------------------------
    // Daily tick: mark yesterday's unfinished tasks as carried over
    // -----------------------------------------------------------------


    public async markIncomplete(
        consultantId: string,
        date: LocalDate,
        expectedVersion?: number,
    ): Promise<VoidResult> {
        const idempotencyKey = `mark_incomplete:${consultantId}:${date}`;
        await this.checkAndLockIdempotency(idempotencyKey);

        try {
            const weekStart = this.timeService.weekOf(date);
            const week = await this.weekService.getWeek(consultantId, weekStart);

            const change: Change = {
                type: 'mark_incomplete',
                date,
                origin: 'system',

            } as Change;

            const ctx: ValidateContext = { bumpedEntityIds: [], allocations: [] };

            const result = await this.weekService.commit(week, change, ctx, expectedVersion);

            if (!result.ok) {
                await this.releaseIdempotency(idempotencyKey);
            }

            return { ok: result.ok, message: result.ok ? undefined : result.violations[0]?.message };
        } catch (error) {
            await this.releaseIdempotency(idempotencyKey);
            throw error;
        }
    }

    // -----------------------------------------------------------------
    // Weekly boundary: migrate non-Done tasks to next week
    // -----------------------------------------------------------------

    public async migrateWeek(fromWeekId: string, toWeekId: string): Promise<VoidResult> {
        const migratedTaskIds = await this.prisma.$transaction(async (tx) => {
            const incompleteTasks = await tx.schedulerTask.findMany({
                where: { weekId: fromWeekId, status: { not: 'Done' } },
            });

            if (incompleteTasks.length === 0) return [];

            for (const task of incompleteTasks) {
                await tx.schedulerTask.update({
                    where: { id: task.id },
                    data: {
                        weekId: toWeekId,
                        placement: 'unplaced',
                        unplacedReason: 'DEADLINE_INFEASIBLE',

                    },
                });

                //await tx.schedulerSlot.deleteMany({ where: { weekId: fromWeekId, taskIds: { has: task.id } } });
            }

            await tx.schedulerWeek.updateMany({
                where: { id: { in: [fromWeekId, toWeekId] } },
                data: { version: { increment: 1 }, lastCommittedAt: new Date() },
            });

            return incompleteTasks.map((t) => t.id);
        });

        return {
            ok: true,
            message: migratedTaskIds.length > 0
                ? `Migrated ${migratedTaskIds.length} task(s) from ${fromWeekId} to ${toWeekId}.`
                : undefined,
        };
    }

    private async checkAndLockIdempotency(key: string): Promise<void> {
        try {
            const typeString = key.split(':')[0];

            await this.prisma.schedulerIdempotencyKey.create({
                data: {
                    key,
                    type: typeString as unknown as IdempotencyKeyType,
                    createdAt: new Date()
                },
            });
        } catch (error: unknown) {
            if (error instanceof Error && (error as { code?: string }).code === 'P2002') {
                throw new ConflictException(`Operation already processed: ${key}`);
            }
            throw error;
        }
    }

    private async releaseIdempotency(key: string): Promise<void> {
        try {

            await this.prisma.schedulerIdempotencyKey.deleteMany({ where: { key } });
        }
        // eslint-disable-next-line no-empty
        catch {

        }
    }
}