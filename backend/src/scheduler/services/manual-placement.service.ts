import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService, CommitResult } from './week.service';
import { TimeService, LocalDate } from './time.service';
import { Change, Interval, ValidateContext } from '../dto/scheduler.dto';

@Injectable()
export class ManualPlacementService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly weekService: WeekService,
        private readonly timeService: TimeService,
    ) { }

    // -----------------------------------------------------------------
    // PATCH /scheduler/slots/:slotId/move
    // -----------------------------------------------------------------

    public async moveSlot(
        slotId: string,
        to: Interval,
        confirmedOverride?: boolean,
        expectedVersion?: number,
    ): Promise<CommitResult> {
        const dbSlot = await this.prisma.schedulerSlot.findUnique({
            where: { id: slotId },
            include: { week: true },
        });

        if (!dbSlot) {
            throw new NotFoundException(`Task slot ${slotId} not found`);
        }

        const consultantId = dbSlot.week.consultantId;
        const weekStart = dbSlot.week.weekStart.toISOString().split('T')[0] as LocalDate;

        const week = await this.weekService.getWeek(consultantId, weekStart);
        const window = this.dayWindow(to.start, week.timezone);

        const tags = this.resolveOverrideTags(to, confirmedOverride, week.timezone);

        const change: Change = {
            type: 'move_slot',
            slotId,
            to,
            origin: 'user',
            window,
            tags,
        } as Change;

        const ctx: ValidateContext = { bumpedEntityIds: [slotId], allocations: [] };

        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    // -----------------------------------------------------------------
    // PATCH /scheduler/blocks/:blockId/move
    // -----------------------------------------------------------------

    public async moveBlock(
        blockId: string,
        to: Interval,
        confirmedOverride?: boolean,
        expectedVersion?: number,
    ): Promise<CommitResult> {
        return this.executeBlockIntervalChange('move_block', blockId, to, confirmedOverride, expectedVersion);
    }

    // -----------------------------------------------------------------
    // PATCH /scheduler/blocks/:blockId/resize
    // -----------------------------------------------------------------

    public async resizeBlock(
        blockId: string,
        to: Interval,
        confirmedOverride?: boolean,
        expectedVersion?: number,
    ): Promise<CommitResult> {
        return this.executeBlockIntervalChange('resize_block', blockId, to, confirmedOverride, expectedVersion);
    }

    private async executeBlockIntervalChange(
        type: 'move_block' | 'resize_block',
        blockId: string,
        to: Interval,
        confirmedOverride?: boolean,
        expectedVersion?: number,
    ): Promise<CommitResult> {
        const { week } = await this.loadBlockContext(blockId);
        const window = this.dayWindow(to.start, week.timezone);

        const change: Change = {
            type,
            blockId,
            to,
            origin: 'user',
            window,
            confirmedOverride,
        };

        const ctx: ValidateContext = { bumpedEntityIds: [blockId], allocations: [] };
        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    // -----------------------------------------------------------------
    // PATCH /scheduler/blocks/:blockId/pin
    // -----------------------------------------------------------------

    public async pinBlock(
        blockId: string,
        pinned: boolean,
        expectedVersion?: number,
    ): Promise<CommitResult> {
        const { dbBlock, week } = await this.loadBlockContext(blockId);
        const window = this.dayWindow(dbBlock.start.toISOString(), week.timezone);

        const change: Change = {
            type: 'pin_block',
            blockId,
            pinned,
            origin: 'user',
            window,
        };

        const ctx: ValidateContext = { bumpedEntityIds: [blockId], allocations: [] };
        return this.weekService.commit(week, change, ctx, expectedVersion);
    }

    // -----------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------

    private async loadBlockContext(blockId: string) {
        const dbBlock = await this.prisma.schedulerProjectBlock.findUnique({
            where: { id: blockId },
            include: { week: true },
        });

        if (!dbBlock) {
            throw new NotFoundException('Project block ' + blockId + ' not found');
        }

        const consultantId = dbBlock.week.consultantId;
        const weekStart = dbBlock.week.weekStart.toISOString().split('T')[0] as LocalDate;
        const week = await this.weekService.getWeek(consultantId, weekStart);

        return { dbBlock, week };
    }

    private resolveOverrideTags(
        to: Interval,
        confirmedOverride: boolean | undefined,
        timezone: string,
    ): string[] | undefined {
        const isOutOfHours = !this.timeService.isRangeInCoreHours(to.start, to.end, timezone);
        if (!isOutOfHours || !confirmedOverride) return undefined;

        const day = DateTime.fromISO(to.start as string, { zone: 'utc' }).setZone(timezone);
        return [day.weekday > 5 ? 'weekend' : 'extended-hours'];
    }

    /** Midnight-to-midnight window (local day) covering the given instant, per design doc Section 9. */
    private dayWindow(instant: string, timezone: string): Interval {
        const day = this.timeService.localDate(instant, timezone);
        const nextDay = DateTime.fromISO(day as string, { zone: 'utc' })
            .plus({ days: 1 })
            .toFormat('yyyy-MM-dd') as LocalDate;

        return {
            start: this.timeService.localDateToInstant(day, timezone),
            end: this.timeService.localDateToInstant(nextDay, timezone),
        };
    }
}