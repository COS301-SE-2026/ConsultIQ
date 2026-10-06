import { apiClient } from "../../../lib/api-client";
import {SCHEDULER_RULES, type SchedulerWeekResponse, type SchedulerCommitResult, type CalendarEntry, type WeekContainer,
    type CreateTaskDto, type UpdateTaskDto, type SetTaskStatusDto, type Task,
    type MoveSlotDto, type MoveBlockDto, type ResizeBlockDto, type PinBlockDto
  } from "../types/scheduler.types";

export function toCalendarWeek(api: SchedulerWeekResponse): WeekContainer {
  const slots = api.slots.map((slot) => {
    const calendarSlot = { ...slot };
    Reflect.deleteProperty(calendarSlot, "weekId");
    Reflect.deleteProperty(calendarSlot, "tags");
    return calendarSlot;
  });
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
    tasks: api.tasks.map((task) => {
    const calendarTask = { ...task };
    Reflect.deleteProperty(calendarTask, "weekId");
    Reflect.deleteProperty(calendarTask, "createdAt");
    Reflect.deleteProperty(calendarTask, "updatedAt");

    return {
      ...calendarTask, urgency: calendarTask.urgency as Task["urgency"],
      complexity: calendarTask.complexity as Task["complexity"], carriedOver: calendarTask.carriedOver ?? false,
      slots: slots.filter((slot) => slot.taskIds.includes(task.id)), subtasks: task.subtasks.map(({ id, title, estimate, done }) => ({ id, title, estimate, done })),
      };
    }),
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

export function toggleSchedulerSubtask(taskId: string, subtaskId: string, expectedVersion: number){
    return apiClient.patch<SchedulerCommitResult>(`/scheduler/tasks/${taskId}/subtasks/${subtaskId}`, { expectedVersion });
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

export function splitSchedulerTask(taskId: string, atMinutes: number, expectedVersion: number){
  return apiClient.post<SchedulerCommitResult>(`/scheduler/tasks/${taskId}/split`, { atMinutes, expectedVersion });
}

export function placeUnplacedTasks(taskIds: string[], expectedVersion: number) {
  return apiClient.post<SchedulerCommitResult>("/scheduler/tasks/place-unplaced", { taskIds, expectedVersion });
}

export function moveSlot({slotId, ...body}:MoveSlotDto) {
  return apiClient.patch<SchedulerCommitResult>(`/scheduler/slots/${slotId}/move`, body);
}

export function moveBlock({blockId, ...body}:MoveBlockDto) {
  return apiClient.patch<SchedulerCommitResult>(`/scheduler/blocks/${blockId}/move`, body);
}

export function resizeBlock({blockId, ...body}:ResizeBlockDto) {
  return apiClient.patch<SchedulerCommitResult>(`/scheduler/blocks/${blockId}/resize`, body);
}

export function pinBlock({blockId, ...body}:PinBlockDto) {
  return apiClient.patch<SchedulerCommitResult>(`/scheduler/blocks/${blockId}/pin`, body);
}



