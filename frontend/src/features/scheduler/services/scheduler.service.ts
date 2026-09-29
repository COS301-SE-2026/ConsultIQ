import { apiClient } from "../../../lib/api-client";
import type { SetTaskStatusDto, Task, } from "../types/scheduler.types";
import {SCHEDULER_RULES, type SchedulerWeekResponse, type SchedulerCommitResult, type CalendarEntry, type WeekContainer,
    type CreateTaskDto, type UpdateTaskDto} from "../types/scheduler.types";

export function toCalendarWeek(api: SchedulerWeekResponse): WeekContainer {
  const slots = api.slots.map(({ weekId: _weekId, tags: _tags, ...slot }) => slot);
  const weekEnd = new Date(`${api.weekStart}T00:00:00Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  return {
    id: api.id,
    consultantId: api.consultantId,
    timezone: api.timezone,
    weekStart: api.weekStart,
    version: api.version,
    blocks: api.blocks.map((block) => ({
      ...block,
      placementId: block.placementId ?? block.id,
    })),
    tasks: api.tasks.map(({ weekId: _weekId, createdAt: _createdAt, updatedAt: _updatedAt, ...task }) => ({
      ...task,
      urgency: task.urgency as Task["urgency"],
      complexity: task.complexity as Task["complexity"],
      carriedOver: task.carriedOver ?? false,
      slots: slots.filter((slot) => slot.taskIds.includes(task.id)),
      subtasks: task.subtasks.map(({ id, title, estimate, done }) => ({ id, title, estimate, done })),
    })),
    entries: api.calendarEntries.map((entry) => ({
      id: entry.id,
      type: (entry.type === "ad-hoc" ? "adhoc" : entry.type) as CalendarEntry["type"],
      start: entry.start,
      end: entry.end,
      tags: entry.tags as CalendarEntry["tags"],
      origin: entry.origin === "public-holiday" ? "public-holiday" : "user",
    })),
    holidays: api.holidays,
    metadata: {
      contractedMinutes: SCHEDULER_RULES.contractedMinutes,
      availableMinutes: api.metadata.available,
      allocatedMinutes: api.metadata.allocated,
      scheduledMinutes: api.metadata.scheduled,
      bufferMinutes: api.metadata.buffer,
      utilization: api.metadata.utilization,
      softCapBreached: api.metadata.softCapBreached,
      hardCapBreached: api.metadata.hardCapBreached,
      hasOutOfHours: api.metadata.hasOutOfHours,
      hasWeekend: api.metadata.hasWeekend,
      hasContainerOverflow: api.metadata.hasContainerOverflow,
      hasUnresolvedRollover: api.tasks.some((task) => task.carriedOver && task.placement === "unplaced"),
      weekStart: api.weekStart,
      weekEnd: weekEnd.toISOString().slice(0, 10),
      workingDays: [...SCHEDULER_RULES.workingDays],
      publicHolidays: api.holidays.map((holiday) => holiday.date),
      leaveDays: [],
      lastCommittedAt: api.lastCommittedAt,
      sourceOfLastChange: api.sourceOfLastChange,
      warnings: [],
      alerts: [],
      unplaced: [],
    },
  };
}
export function getSchedulerWeek(weekStart: string, signal?: AbortSignal){
    return apiClient.get<SchedulerWeekResponse>(`/scheduler/weeks/${weekStart}`, { signal });
}

export function setSchedulerTaskStatus(taskId: string, dto: SetTaskStatusDto){
    return apiClient.patch<SchedulerCommitResult>(`/scheduler/tasks/${taskId}/status`, dto);
}

export function createSchedulerTask(weekStart: string, dto: CreateTaskDto){
    return apiClient.post<SchedulerCommitResult>(`/scheduler/weeks/${weekStart}/tasks`, dto);
}

export function updateSchedulerTask(taskId: string, dto: UpdateTaskDto){
    return apiClient.patch<SchedulerCommitResult>(`/scheduler/tasks/${taskId}`, dto);
}

export function deleteSchedulerTask(taskId: string, expectedVersion: number) {
  return apiClient.delete<SchedulerCommitResult>(`/scheduler/tasks/${taskId}`, {
    body: JSON.stringify({ expectedVersion }),
    headers: { "Content-Type": "application/json" },
  });
}