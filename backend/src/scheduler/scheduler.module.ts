import { Module } from '@nestjs/common';
import { SchedulerController } from '../controllers/scheduler/scheduler.controller';
import { WeekService } from './services/week.service';
import { TaskService } from './services/task.service';
import { ManualPlacementService } from './services/manual-placement.service';
import { CalendarService } from './services/calendar.service';
import { AdvisoryService } from './services/advisory.service';
import { RolloverService } from './services/rollover.service';
import { TickService } from './services/tick.service';
import { TimeService } from './services/time.service';
import { HolidayService } from './services/holiday.service';
import { PlacerService } from './services/placer.service';
import { ValidatorService } from './services/validator.service';


@Module({
    controllers: [SchedulerController],
    providers: [
        WeekService,
        TaskService,
        ManualPlacementService,
        CalendarService,
        AdvisoryService,
        RolloverService,
        TickService,
        TimeService,
        HolidayService,
        PlacerService,
        ValidatorService,
    ],
    exports: [WeekService],
})
export class SchedulerModule { }