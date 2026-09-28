import { ReasonCode, type IssueLevel } from "../types/scheduler.types";

export type AlertActionKind = | "dismiss" | "openBacklog" | "openDeadlineDialog" | "openSplitDialog" | "resolveContainer" | "viewSuggestions";

export interface ReasonCodeEntry {
    title: string;
    message: string;
    severity: IssueLevel;
    actions: AlertActionKind[];
}

export const reasonCodeRegistry: Record<ReasonCode, ReasonCodeEntry> = {
    [ReasonCode.OUT_OF_HOURS_UNTAGGED]: {
        title: "Entry outside working hours",
        message: "This is scheduled outside your core hours and isn't tagged as extended.",
        severity: "warning",
        actions: ["dismiss"],
    },
    [ReasonCode.DAILY_MAX_EXCEEDED]: {
    title: "Daily limit exceeded",
    message: "This day has more scheduled time than your daily maximum.",
    severity: "warning",
    actions: ["dismiss"],
  },
  [ReasonCode.SOFT_CAP_BREACH]: {
    title: "Significant overload",
    message: "Your scheduled hours are over your weekly contract.",
    severity: "warning",
    actions: ["dismiss"],
  },
  [ReasonCode.HARD_CAP_BREACH]: {
    title: "Hard capacity limit breached",
    message: "Your scheduled hours are over the hard weekly cap — this needs attention.",
    severity: "violation",
    actions: ["dismiss"],
  },
  [ReasonCode.FRAGMENT_TOO_SMALL]: {
    title: "Fragment too small",
    message: "A scheduled fragment is smaller than the minimum block duration.",
    severity: "warning",
    actions: ["dismiss"],
  },
  [ReasonCode.FROZEN_ENTITY_MOVED]: {
    title: "Locked item moved",
    message: "A locked calendar item was moved — this shouldn't normally happen.",
    severity: "violation",
    actions: ["dismiss"],
  },
  [ReasonCode.DEPENDENCY_ORDER]: {
    title: "Dependency order violated",
    message: "A task is scheduled before something it depends on.",
    severity: "violation",
    actions: ["dismiss"],
  },
  [ReasonCode.TASK_LARGER_THAN_CONTAINER]: {
    title: "Task too large for this block",
    message: "This task's estimate is larger than the space available for it.",
    severity: "violation",
    actions: ["dismiss", "openSplitDialog"],
  },
  [ReasonCode.DAY_SPAN_LIMIT_AT_RISK]: {
    title: "Approaching the day-span limit",
    message: "This task is likely to spread across more days than recommended.",
    severity: "warning",
    actions: ["dismiss"],
  },
  [ReasonCode.CONTAINER_OVERFLOW]: {
    title: "Project over its allocation",
    message: "This project has more scheduled time than its weekly allocation.",
    severity: "warning",
    actions: ["dismiss", "resolveContainer"],
  },
  [ReasonCode.UNPLACED_TASKS]: {
    title: "Some tasks couldn't be placed",
    message: "A few tasks didn't fit anywhere this week.",
    severity: "warning",
    actions: ["dismiss", "openBacklog"],
  },
  [ReasonCode.DEADLINE_INFEASIBLE]: {
    title: "Deadline at risk",
    message: "This task can't finish before its deadline with the time available.",
    severity: "violation",
    actions: ["dismiss", "openDeadlineDialog"],
  },
  [ReasonCode.CONTAINERS_EXCEED_CONTRACT]: {
    title: "Allocations exceed contract",
    message: "Combined project allocations add up to more than your contracted hours.",
    severity: "violation",
    actions: ["dismiss"],
  },
  [ReasonCode.INVALID_ENTRY_ORIGIN]: {
    title: "Invalid entry origin",
    message: "This calendar entry has an origin that isn't allowed here.",
    severity: "violation",
    actions: ["dismiss"],
  },
  [ReasonCode.DAY_SPAN_LIMIT]: {
    title: "Day-span limit exceeded",
    message: "This task would need to spread across too many days to place.",
    severity: "violation",
    actions: ["dismiss", "openSplitDialog"],
  },
  [ReasonCode.CONTAINER_FULL]: {
    title: "No room this week",
    message: "There's no space left in this project's allocation for this task.",
    severity: "warning",
    actions: ["dismiss", "openBacklog"],
  },
  [ReasonCode.NO_BUMP_CANDIDATE]: {
    title: "Nothing available to bump",
    message: "There's no lower-priority item that can be moved to make room.",
    severity: "violation",
    actions: ["dismiss"],
  },
  [ReasonCode.BUMP_FAILED]: {
    title: "Couldn't rearrange schedule",
    message: "An attempt to make room by rearranging other work failed.",
    severity: "violation",
    actions: ["dismiss"],
  },
  [ReasonCode.DISPLACED_TASK_UNPLACEABLE]: {
    title: "Displaced task has nowhere to go",
    message: "Making room for this pushed another task out with no space for it either.",
    severity: "violation",
    actions: ["dismiss", "openBacklog"],
  },
  [ReasonCode.SPLIT_NOT_ALLOWED]: {
    title: "Can't split this task",
    message: "This task can't be split in its current state.",
    severity: "violation",
    actions: ["dismiss"],
  },
  [ReasonCode.SPLIT_TOO_SMALL]: {
    title: "Split too small",
    message: "That split point would leave one half under the minimum size.",
    severity: "violation",
    actions: ["dismiss"],
  },
  [ReasonCode.SPLIT_STRADDLES_SUBTASK]: {
    title: "Split falls inside a subtask",
    message: "That split point would cut a subtask in half.",
    severity: "violation",
    actions: ["dismiss"],
  },
  [ReasonCode.HOLIDAY_ENTRY_IMMUTABLE]: {
    title: "Holiday can't be changed",
    message: "Public holiday entries can't be edited or moved.",
    severity: "violation",
    actions: ["dismiss"],
  },
  [ReasonCode.DEADLINE_MISSED]: {
    title: "Deadline missed",
    message: "This task's deadline has passed.",
    severity: "warning",
    actions: ["dismiss"],
  },
  [ReasonCode.UNDERUTILISED]: {
    title: "You have spare capacity",
    message: "There's unused time this week beyond your buffer.",
    severity: "info",
    actions: ["dismiss", "viewSuggestions"],
  }
}