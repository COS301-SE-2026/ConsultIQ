import { IsString, IsInt, IsNotEmpty, IsOptional, IsArray, IsBoolean, IsObject, IsDateString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { Change, Interval } from './scheduler.dto';

export class ConcurrencyControlDto {
    @IsInt()
    @IsNotEmpty({ message: 'expectedVersion is required for optimistic concurrency control.' })
    expectedVersion!: number;
}


export class ReplanDto extends ConcurrencyControlDto { }

export class DryRunDto extends ConcurrencyControlDto {
    @IsObject()
    @IsNotEmpty()
    change!: Change;
}

export class CreateTaskDto extends ConcurrencyControlDto {
    @IsString()
    @IsNotEmpty()
    projectId!: string;

    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsInt()
    @IsOptional()
    tMin?: number;

    @IsInt()
    @IsOptional()
    tMax?: number;

    @IsInt()
    @IsOptional()
    urgency?: number;

    @IsInt()
    @IsOptional()
    complexity?: number;
    
   @IsDateString()
    @IsOptional()
    deadline?: string;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => SchedulerSubtaskDto)
    @IsOptional()
    subtasks?: SchedulerSubtaskDto[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    dependsOn?: string[];
}

export class UpdateTaskDto extends ConcurrencyControlDto {
    @IsString()
    @IsOptional()
    projectId?: string;

    @IsString()
    @IsOptional()
    title?: string;

    @IsInt()
    @IsOptional()
    tMin?: number;

    @IsInt()
    @IsOptional()
    tMax?: number;

    @IsInt()
    @IsOptional()
    urgency?: number;

    @IsInt()
    @IsOptional()
    complexity?: number;

    @IsDateString()
    @IsOptional()
    deadline?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SchedulerSubtaskDto)
    @IsOptional()
    subtasks?: SchedulerSubtaskDto[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    dependsOn?: string[];
}

export class SetTaskStatusDto extends ConcurrencyControlDto {
    @IsString()
    @IsNotEmpty()
    status!: 'Ready' | 'InProgress' | 'Done';
}

export class SplitTaskDto extends ConcurrencyControlDto {
    @IsInt()
    @IsNotEmpty()
    atMinutes!: number;
}

export class TaskIdsDto extends ConcurrencyControlDto {
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    taskIds!: string[];
}

export class RolloverDto extends ConcurrencyControlDto {
    @IsString()
    @IsNotEmpty()
    fromSlotId!: string;
}

export class MoveIntervalDto extends ConcurrencyControlDto {
    @IsObject()
    @IsNotEmpty()
    to!: Interval;

    @IsBoolean()
    @IsOptional()
    confirmedOverride?: boolean;
}

export class PinBlockDto extends ConcurrencyControlDto {
    @IsBoolean()
    @IsNotEmpty()
    pinned!: boolean;
}

export class SchedulerSubtaskDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  estimate?: number;

  @IsBoolean()
  done!: boolean;
}