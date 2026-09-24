

export type Instant = string;

export type LocalDate = string;

export type Minutes = number;

export interface Interval {
    start: Instant;
    end: Instant;
}

export const SCHEDULER_RULES = {
    coreStart: '08:00',
    coreEnd: '16:00',
    workingDays: [1, 2, 3, 4, 5],
    unpaidLunchMin: 60,
    lunchAfterContinuousMin: 300,
    contractedMinutes: 2400,
    hardCapMinutes: 2700,
    dailyMaxMinutes: 480,
    bufferTargetMin: 0.15,
    bufferTargetMax: 0.20,
    maxDaysSpanned: 3,
    minBlockDuration: 60,
} as const;


export type SchedulerRules = typeof SCHEDULER_RULES;


export const ReasonCode = {
    OUT_OF_HOURS_UNTAGGED: "OUT_OF_HOURS_UNTAGGED",
    DAILY_MAX_EXCEEDED: "DAILY_MAX_EXCEEDED",
    SOFT_CAP_BREACH: "SOFT_CAP_BREACH",
    HARD_CAP_BREACH: "HARD_CAP_BREACH",
    FRAGMENT_TOO_SMALL: "FRAGMENT_TOO_SMALL",
    FROZEN_ENTITY_MOVED: "FROZEN_ENTITY_MOVED",
    DEPENDENCY_ORDER: "DEPENDENCY_ORDER",
    TASK_LARGER_THAN_CONTAINER: "TASK_LARGER_THAN_CONTAINER",
    DAY_SPAN_LIMIT_AT_RISK: "DAY_SPAN_LIMIT_AT_RISK",
    CONTAINER_OVERFLOW: "CONTAINER_OVERFLOW",
    UNPLACED_TASKS: "UNPLACED_TASKS",
    DEADLINE_INFEASIBLE: "DEADLINE_INFEASIBLE",
    CONTAINERS_EXCEED_CONTRACT: "CONTAINERS_EXCEED_CONTRACT",
    INVALID_ENTRY_ORIGIN: "INVALID_ENTRY_ORIGIN",
    DAY_SPAN_LIMIT: "DAY_SPAN_LIMIT",
    CONTAINER_FULL: "CONTAINER_FULL",
    NO_BUMP_CANDIDATE: "NO_BUMP_CANDIDATE",
    BUMP_FAILED: "BUMP_FAILED",
    DISPLACED_TASK_UNPLACEABLE: "DISPLACED_TASK_UNPLACEABLE",
    SPLIT_NOT_ALLOWED: "SPLIT_NOT_ALLOWED",
    SPLIT_TOO_SMALL: "SPLIT_TOO_SMALL",
    SPLIT_STRADDLES_SUBTASK: "SPLIT_STRADDLES_SUBTASK",
    HOLIDAY_ENTRY_IMMUTABLE: "HOLIDAY_ENTRY_IMMUTABLE",
    DEADLINE_MISSED: "DEADLINE_MISSED",
    UNDERUTILISED: "UNDERUTILISED",
} as const;

export type ReasonCode = (typeof ReasonCode)[keyof typeof ReasonCode];

export type SuggestionCode = | "PLACE_UNPLACED" | "PULL_FORWARD" | "EXTEND_BLOCK" | "COPY_SUMMARY";

export interface PlaceUnplacedPayload {
    taskIds: string[];
}

export interface PullFowardPayload {
    taskIds: string[];
    minutes: Minutes;
}

export interface ExtendBlockPayload {
    projectId: string;
    minutes: Minutes;

}

export interface CopySummaryPayload {
    availableMinutes: Minutes;
    allocatedMinutes: Minutes;
    scheduledMinutes: Minutes;
    bufferMinutes: Minutes;
}

export type Suggestion =
    | { code: "PLACE_UNPLACED"; label: string; payload: PlaceUnplacedPayload }
    | { code: "PULL_FORWARD"; label: string; payload: PullFowardPayload }
    | { code: "EXTEND_BLOCK"; label: string; payload: ExtendBlockPayload }
    | { code: "COPY_SUMMARY"; label: string; payload: CopySummaryPayload }

export type IssueLevel = "violation" | "warning" | "info";

export interface Issue {
    level: IssueLevel;
    code: ReasonCode;
    message: string;
    entityIds?: string[];
    persistent?: boolean;
    suggestions?: Suggestion[];
}

export interface ResultOk<T> {
    ok: true;
    value: T;
    warnings: Issue[];
    infos: Issue[];
}

export interface ResultFail {
    ok: false;
    violations: Issue[];
    warnings: Issue[];
}

export type Result<T> = ResultOk<T> | ResultFail;

export interface Subtask {
    id: string;
    title: string;
    estimate?: Minutes;
    done: boolean;
}

export type SlotKind = "task" | "batch";

export interface Slot {
    id: string;
    kind: SlotKind;
    taskIds: string[];
    subtasksIds?: string[];
    blockId: string;
    start: Instant;
    end: Instant;
    locked: boolean;
    daySpan?: number;
}

export type TaskStatus = "Ready" | "InProgress" | "Done";

export type TaskPlacement = "placed" | "unplaced";


export interface Task {
    id: string;
    projectId: string;
    title: string;
    tMin: Minutes;
    tMax: Minutes;
    deadline?: string;
    urgency: number;
    complexity: number;
    status: TaskStatus;
    subtasks: Subtask[];
    slots: Slot[];
    dependsOn: string[];
    splitFromId?: string;
    carriedOver?: boolean;
    placement: TaskPlacement;
    unplacedReason?: ReasonCode;
}

export interface NewTask {
    projectId: string;
    title: string;
    tMin: Minutes;
    tMax: Minutes;
    deadline?: Instant;
    urgency: number;
    complexity: number;
    subtasks: Subtask[];
    dependsOn: string[];
}

export type BlockMobility = "fluid" | "pinned";

export interface ProjectBlock {
    id: string;
    projectId: string;
    placementId: string;
    allocatedMinutes: Minutes;
    start: Instant;
    end: Instant;
    mobility: BlockMobility;
    userSized?: boolean;
}

export type CalendarEntryType =
    | 'meeting'
    | 'lunch'
    | 'admin'
    | 'training'
    | 'travel'
    | 'personal'
    | 'holiday'
    | 'leave'
    | 'adhoc'
    | 'other';

export type CalendarTag = "extended-hours" | "weekend";

export type CalendarEntryOrigin = "user" | "public-holiday";

export interface CalendarEntry {
    id: string;
    type: CalendarEntryType;
    start: Instant;
    end: Instant;
    tags: CalendarTag;
    origin: CalendarEntryOrigin;
}

export interface PublicHoliday {
    id: string;
    date: LocalDate;
    name: string;


}

interface UnplacedTaskSummary {
    taskId: string;
    reason: ReasonCode;
    neededMinutes: Minutes;
    availableMinutes: Minutes;
    deadline?: Instant;
}

interface AllocationSummary {
    consultantId: string;
    projectId: string;
    allocation: number;
    periodStart: LocalDate;
    periodEnd?: LocalDate;
}

interface WeekMetadata {
    contractedMinutes: Minutes;
    availableMinutes: Minutes;
    allocatedMinutes: Minutes;
    scheduledMinutes: Minutes;
    bufferMinutes: Minutes;
    utilization: number;
    softCapBreached: boolean;
    hardCapBreached: boolean;
    hasOutOfHours: boolean;
    hasWeekend: boolean;
    hasContainerOverflow: boolean;
    hasUnresolvedRollover: boolean;
    weekStart: LocalDate;
    weekEnd: LocalDate;
    workingDays: number[];
    publicHolidays: LocalDate[];
    leaveDays: LocalDate[];
    lastCommittedAt?: Instant;
    sourceOfLastChange?: string;
    warnings: Issue[];
    alerts: Issue[];
    unplaced: UnplacedTaskSummary[];
}

interface WeekContainer {
    id: string;
    consultantId: string;
    timezone: string;
    weekStart: LocalDate;
    version: number;
    blocks: ProjectBlock[];
    tasks: Task[];
    entries: CalendarEntry[];
    holidays: PublicHoliday[];
    metadata: WeekMetadata;
}

export type Change =
| {type: "create_task"; task: NewTask}
| {type: "Update_task"; taskId: string; patch: Partial<Task>}
| {type: "delete_task"; taskId: string}
| { type: 'set_status'; taskId: string; status: TaskStatus}
| {type: 'toggle_subtask'; taskId: string; subtaskId: string }
| {type: 'split_task'; taskId: string; atMinutes: Minutes}
| {type: 'move_slot'; slotId: string; to: Interval}
| {type: 'move_block'; blockId: string; to: Interval}
| {type: 'pin_block'; blockId: string; pinned: boolean}
| {type: 'resize_block'; blockId: string; to: Interval}
| {type: 'calendar_upsert'; entry: CalendarEntry}
| {type: 'calendar_remove'; entryId: string}
| {type: 'set_project_hours'; projectId: string; minutes: Minutes}
| {type: 'rollover'; taskId: string; fromSlotId: string}
| {type: 'mark_incomplete'; date: LocalDate}
| {type: 'pull_forward'; taskIds: string[]}
| {type: 'place_unplaced'; taskIds: string[]}
| {type: 'accept_deadline_miss'; taskId: string}
| {type: 'defer_to_next_week'; taskIds: string[]}
| {type: 'replan'; window: Interval};

export type ChangeType = Change["type"];

export interface PlaceReport {
    placed: string[];
    unplaced: UnplacedTaskSummary[];
}

export type CreateTaskDto = NewTask;

export type UpdateTaskDto = Partial<Task>;

export interface SetTaskStatusDto {
    status: TaskStatus;
}

export interface SplitTaskDto{
    atMinutes: Minutes;
}

export type AcceptDeadlineMissDto = Record<string, never>;


export interface DeferToNextWeekDto{
    taskIds: string[];

}

export interface PlaceUnplacedDto{
    taskIds: string[];
}

export interface PullForwardDto{
    taskIds: string[];
}

export type CalendarEntryDto = Omit<CalendarEntry, 'id'> & {
  id?: string;
  confirmedOverride?: boolean;
};

export interface MoveSlotDto {
  slotId: string;
  to: Interval;
  confirmedOverride?: boolean;
}

export interface MoveBlockDto{
    blockId: string;
    to: Interval;
    confirmedOverride? : boolean;
}

export interface ResizeBlockDto{
    blockId: string;
    to: Interval;
    confirmedOverride? : boolean;
}

export interface PinBlockDto{
    blockId: string;
    pinned: boolean;
}

export interface DryRunDto{
    change: Change;
}

export interface ProjectSummary{
    id: string;
    name: string;
    clientName: string;
}