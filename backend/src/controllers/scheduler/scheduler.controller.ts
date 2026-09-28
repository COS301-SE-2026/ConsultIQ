import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';

import { WeekService } from '../../scheduler/services/week.service';
import { TaskService } from '../../scheduler/services/task.service';
import { ManualPlacementService } from '../../scheduler/services/manual-placement.service';
import { CalendarService } from '../../scheduler/services/calendar.service';
import { AdvisoryService } from '../../scheduler/services/advisory.service';
import { RolloverService } from '../../scheduler/services/rollover.service';


import { Change, Interval } from '../../scheduler/dto/scheduler.dto';
import { LocalDate } from '../../scheduler/services/time.service';

@Controller('scheduler')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CONSULTANT)
export class SchedulerController {
    constructor(
        private readonly weekService: WeekService,
        private readonly taskService: TaskService,
        private readonly manualPlacementService: ManualPlacementService,
        private readonly calendarService: CalendarService,
        private readonly advisoryService: AdvisoryService,
        private readonly rolloverService: RolloverService,
    ) { }

    // --- WEEKS ---

    @Get('weeks/:weekStart')
    async getWeek(
        @Param('weekStart') weekStart: string,
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.weekService.getWeek(consultantId, weekStart as LocalDate);
    }

    @Post('weeks/:weekStart/replan')
    async replan(
        @Param('weekStart') weekStart: string,
        @Body() body: { expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        const week = await this.weekService.getWeek(consultantId, weekStart as LocalDate);
        return this.weekService.replan(week.id, body.expectedVersion);
    }

    @Post('weeks/:weekStart/dry-run')
    async dryRun(
        @Param('weekStart') weekStart: string,
        @Body() body: { change: Change; expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        const week = await this.weekService.getWeek(consultantId, weekStart as LocalDate);
        return this.weekService.dryRun(week.id, body.change, body.expectedVersion);
    }

    // --- TASKS ---

    @Post('weeks/:weekStart/tasks')
    async createTask(
        @Param('weekStart') weekStart: string,
        @Body() body: any,
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        const { expectedVersion, ...dto } = body;
        return this.taskService.create(consultantId, weekStart as LocalDate, dto, expectedVersion);
    }

    @Patch('tasks/:taskId')
    async updateTask(
        @Param('taskId') taskId: string,
        @Body() body: any,
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        const { expectedVersion, ...patch } = body;
        return this.taskService.update(consultantId, taskId, patch, expectedVersion);
    }

    @Delete('tasks/:taskId')
    async deleteTask(
        @Param('taskId') taskId: string,
        @Body() body: { expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.taskService.deleteTask(consultantId, taskId, body.expectedVersion);
    }

    @Patch('tasks/:taskId/status')
    async setTaskStatus(
        @Param('taskId') taskId: string,
        @Body() body: { status: 'Ready' | 'InProgress' | 'Done'; expectedVersion?: number; },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.taskService.setStatus(consultantId, taskId, body.status, body.expectedVersion);
    }

    @Patch('tasks/:taskId/subtasks/:subtaskId')
    async toggleSubtask(
        @Param('taskId') taskId: string,
        @Param('subtaskId') subtaskId: string,
        @Body() body: { expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.taskService.toggleSubtask(consultantId, taskId, subtaskId, body.expectedVersion);
    }

    @Post('tasks/:taskId/split')
    async splitTask(
        @Param('taskId') taskId: string,
        @Body() body: { atMinutes: number; expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.taskService.split(consultantId, taskId, body.atMinutes, body.expectedVersion);
    }

    @Post('tasks/:taskId/accept-deadline-miss')
    async acceptDeadlineMiss(
        @Param('taskId') taskId: string,
        @Body() body: { expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.taskService.acceptDeadlineMiss(consultantId, taskId, body.expectedVersion);
    }

    @Post('tasks/defer')
    async deferTasks(
        @Body() body: { taskIds: string[]; expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.taskService.deferToNextWeek(consultantId, body.taskIds, body.expectedVersion);
    }

    @Post('tasks/place-unplaced')
    async placeUnplaced(
        @Body() body: { taskIds: string[]; expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.taskService.placeUnplaced(consultantId, body.taskIds, body.expectedVersion);
    }

    @Post('tasks/:taskId/rollover')
    async rolloverTask(
        @Param('taskId') taskId: string,
        @Body() body: { fromSlotId: string; expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.rolloverService.rollover(consultantId, taskId, body.fromSlotId, body.expectedVersion);
    }

    // --- MANUAL PLACEMENT (SLOTS & BLOCKS) ---

    @Patch('slots/:slotId/move')
    async moveSlot(
        @Param('slotId') slotId: string,
        @Body() body: { to: Interval; confirmedOverride?: boolean; expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.manualPlacementService.moveSlot(
            consultantId,
            slotId,
            body.to,
            body.confirmedOverride,
            body.expectedVersion,
        );
    }

    @Patch('blocks/:blockId/move')
    async moveBlock(
        @Param('blockId') blockId: string,
        @Body() body: { to: Interval; confirmedOverride?: boolean; expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.manualPlacementService.moveBlock(
            consultantId,
            blockId,
            body.to,
            body.confirmedOverride,
            body.expectedVersion,
        );
    }

    @Patch('blocks/:blockId/resize')
    async resizeBlock(
        @Param('blockId') blockId: string,
        @Body() body: { to: Interval; confirmedOverride?: boolean; expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.manualPlacementService.resizeBlock(
            consultantId,
            blockId,
            body.to,
            body.confirmedOverride,
            body.expectedVersion,
        );
    }

    @Patch('blocks/:blockId/pin')
    async pinBlock(
        @Param('blockId') blockId: string,
        @Body() body: { pinned: boolean; expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.manualPlacementService.pinBlock(consultantId, blockId, body.pinned, body.expectedVersion);
    }

    // --- CALENDAR ENTRIES ---

    @Post('weeks/:weekStart/calendar-entries')
    async upsertCalendarEntry(
        @Param('weekStart') weekStart: string,
        @Body() body: any,
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.calendarService.upsert(consultantId, weekStart as LocalDate, body);
    }

    @Patch('weeks/:weekStart/calendar-entries/:entryId')
    async updateCalendarEntry(
        @Param('weekStart') weekStart: string,
        @Param('entryId') entryId: string,
        @Body() body: any,
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        const entry = { ...body, id: entryId };
        return this.calendarService.upsert(consultantId, weekStart as LocalDate, entry);
    }

    @Delete('calendar-entries/:entryId')
    async removeCalendarEntry(
        @Param('entryId') entryId: string,
        @Body() body: { expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        return this.calendarService.remove(consultantId, entryId, body.expectedVersion);
    }

    // --- ADVISORY & SUGGESTIONS ---

    @Get('weeks/:weekStart/suggestions')
    async getSuggestions(
        @Param('weekStart') weekStart: string,
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        const week = await this.weekService.getWeek(consultantId, weekStart as LocalDate);
        return this.advisoryService.buildSuggestions(week);
    }

    @Post('weeks/:weekStart/pull-forward')
    async pullForward(
        @Param('weekStart') weekStart: string,
        @Body() body: { taskIds: string[]; expectedVersion?: number },
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        const week = await this.weekService.getWeek(consultantId, weekStart as LocalDate);
        return this.advisoryService.pullForward(week.id, body.taskIds, body.expectedVersion);
    }

    @Post('weeks/:weekStart/issues/:code/dismiss')
    @HttpCode(HttpStatus.NO_CONTENT)
    async dismissSuggestion(
        @Param('weekStart') weekStart: string,
        @Param('code') code: string,
        @Req() req: any,
    ): Promise<any> {
        const consultantId = req.user?.userId;
        const week = await this.weekService.getWeek(consultantId, weekStart as LocalDate);
        return this.advisoryService.dismiss(week.id, code);
    }
}