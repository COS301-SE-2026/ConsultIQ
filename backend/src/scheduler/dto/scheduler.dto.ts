
export interface Interval {
    start: string;
    end: string;
}

export type ReasonCode =
    | 'SPLIT_NOT_ALLOWED' | 'SPLIT_TOO_SMALL' | 'SPLIT_STRADDLES_SUBTASK' | 'FRAGMENT_LIMIT'
    | 'CONTAINER_FULL' | 'DEADLINE_INFEASIBLE' | 'OUT_OF_HOURS_UNTAGGED' | 'DAILY_MAX_EXCEEDED'
    | 'SOFT_CAP_BREACH' | 'HARD_CAP_BREACH' | 'FROZEN_ENTITY_MOVED' | 'FRAGMENT_TOO_SMALL'
    | 'DEPENDENCY_ORDER' | 'CONTAINERS_EXCEED_CONTRACT' | 'TASK_LARGER_THAN_CONTAINER'
    | 'FRAGMENT_LIMIT_AT_RISK' | 'CONTAINER_OVERFLOW' | 'UNPLACED_TASKS' | 'DAY_SPAN_LIMIT'
    | 'DAY_SPAN_LIMIT_AT_RISK' | 'DEADLINE_MISSED' | 'HOLIDAY_ENTRY_IMMUTABLE'
    | 'NO_BUMP_CANDIDATE' | 'BUMP_FAILED' | 'DISPLACED_TASK_UNPLACEABLE' | 'INVALID_ENTRY_ORIGIN'
    | 'VERSION_CONFLICT';

export interface Issue {
    level: 'violation' | 'warning' | 'info';
    code: ReasonCode;
    message: string;
    persistent?: boolean;
    suggestions?: Suggestion[];
}

export interface Result<T = void> {
    ok: boolean;
    data?: T;
    issues?: Issue[];
}

export type SuggestionCode =
    | 'PLACE_UNPLACED' | 'PULL_FORWARD' | 'EXTEND_BLOCK' | 'COPY_SUMMARY';

export interface PlaceUnplacedPayload {
    taskIds: string[];
}

export interface PullForwardPayload {
    taskIds: string[];
}

export interface ExtendBlockPayload {
    projectId: string;
    minutesToAdd: number;
}

export interface CopySummaryPayload {
    capacity: number;
    allocation: number;
    gap: number;
}

export interface Suggestion {
    code: SuggestionCode;
    payload:
    | PlaceUnplacedPayload
    | PullForwardPayload
    | ExtendBlockPayload
    | CopySummaryPayload;
}

// --- Entities ---

export interface Subtask {
    id: string;
    taskId: string;
    title: string;
    estimate: number; // in minutes
    done: boolean;
}

export interface Task {
    id: string;
    weekId: string;
    projectId: string;
    title: string;
    tMin: number; // minimum estimate in minutes
    tMax: number; // maximum estimate in minutes
    deadline?: string;
    urgency: number;
    complexity: number;
    status: 'Ready' | 'InProgress' | 'Done';
    dependsOn: string[];
    splitFromId?: string;
    carriedOver: boolean;
    placement: 'placed' | 'unplaced';
    unplacedReason?: UnplacedReason;
    priorityScore?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Slot {
    id: string;
    weekId: string;
    kind: 'task' | 'batch';
    blockId: string;
    start: string;
    end: string;
    locked: boolean;
    daySpan?: number;
    taskIds: string[];
    subtaskIds?: string[];
    tags?: string[];
}

export interface ProjectBlock {
    id: string;
    weekId: string;
    projectId: string;
    placementId?: string;
    allocatedMinutes: number;
    start: string;
    end: string;
    mobility: 'fluid' | 'pinned';
    userSized: boolean;
}

export interface CalendarEntry {
    id: string;
    weekId: string;
    type: 'meeting' | 'training' | 'travel' | 'personal' | 'leave' | 'ad-hoc';
    start: string;
    end: string;
    tags: string[];
    origin: 'user' | 'feed' | 'system' | 'public-holiday';
}
export interface CalendarEntryDto {
    id?: string;
    weekId?: string;

    type: 'meeting' | 'training' | 'travel' | 'personal' | 'leave' | 'ad-hoc';
    start: string;
    end: string;
    tags: string[];
    origin: 'user' | 'feed' | 'system' | 'public-holiday';

    confirmedOverride?: boolean;
    expectedVersion?: number;
}

export interface PublicHoliday {
    id: string;
    date: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

// --- Metadata ---

export type UnplacedReason = 'DAY_SPAN_LIMIT' | 'DEADLINE_INFEASIBLE' | 'CONTAINER_FULL';

export interface UnplacedTaskSummary {
    reason: UnplacedReason;
    neededMinutes: number;
    availableMinutes: number;
    deadline?: string;
}

// export interface PlaceReport {
//     placed: Task[];
//     unplaced: Task[];
// }
export interface PlaceReport {
    placed: string[]; // Array of successfully placed task IDs
    unplaced: {
        taskId: string;
        summary: UnplacedTaskSummary;
    }[];
}

export interface AllocationSummary {
    projectId: string;
    allocation: number;
    allocatedMinutes: number;
}

export interface WeekMetadata {
    available: number;
    allocated: number;
    scheduled: number;
    buffer: number;
    utilization: number;
    softCapBreached: boolean;
    hardCapBreached: boolean;
    hasOutOfHours: boolean;
    hasWeekend: boolean;
    hasContainerOverflow: boolean;
}

export interface WeekContainer {
    id: string;
    consultantId: string;
    timezone: string;
    weekStart: string;
    version: number;
    lastCommittedAt: string;
    sourceOfLastChange: string;
    createdAt: string;
    updatedAt: string;

    blocks: ProjectBlock[];
    tasks: Task[];
    slots: Slot[];
    calendarEntries: CalendarEntry[];
    holidays: PublicHoliday[];
    metadata: WeekMetadata;
}

// --- Settings ---

export interface SchedulerSettings {
    planningTime: string;
    autoRebalance: boolean;
}

export interface BaseChange {
    type: string;
    confirmedOverride?: boolean;
}


export type Change =
    | (BaseChange & { type: 'create_task'; payload: Partial<Task> })
    | (BaseChange & { type: 'update_task'; taskId: string; payload: Partial<Task> })
    | (BaseChange & { type: 'split_task'; taskId: string; atMinutes: number })
    | (BaseChange & { type: 'move_slot'; slotId: string; to: Interval; tags?: string[]; confirmedOverride?: boolean; origin: 'user' | 'system'; window: Interval })
    | (BaseChange & { type: 'move_block'; blockId: string; to: Interval; confirmedOverride?: boolean; origin: 'user' | 'system'; window: Interval })
    | (BaseChange & { type: 'resize_block'; blockId: string; to: Interval; confirmedOverride?: boolean; origin: 'user' | 'system'; window: Interval })
    | (BaseChange & { type: 'pin_block'; blockId: string; pinned: boolean; origin: 'user' | 'system'; window: Interval })
    | (BaseChange & { type: 'set_project_hours'; allocations: AllocationSummary[] })
    | (BaseChange & { type: 'borrow_hours'; fromProjectId: string; toProjectId: string; minutes: number })
    | (BaseChange & { type: 'calendar_upsert'; entry: CalendarEntryDto; origin: 'user' | 'system'; window: Interval })
    | (BaseChange & { type: 'calendar_remove'; entryId: string; origin: 'user' | 'system'; window: Interval })
    | { type: 'replan'; window: Interval };


export interface ValidateContext {
    previousWeek?: WeekContainer;
    bumpedEntityIds?: string[];
    allowBump?: boolean;
    allocations?: AllocationSummary[];
}


export interface Issue {
    level: 'violation' | 'warning' | 'info';
    code: ReasonCode;
    message: string;
    persistent?: boolean;
    suggestions?: Suggestion[];
    entityIds?: string[];
}

export type PlaceTaskResult =
    | { ok: true; data: Slot[] }
    | { ok: false; summary: UnplacedTaskSummary; code?: string };