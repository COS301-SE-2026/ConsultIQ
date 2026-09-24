/**
 * Scheduler fixtures — fake WeekContainers for building UI before the API exists.
 *
 * All weeks belong to one consultant in Africa/Johannesburg (SAST, UTC+2, no DST).
 *
 *   designWeek     14–18 Sep 2026  Reproduces the two design screenshots (overloaded, 44.2h)
 *   holidayWeek    21–25 Sep 2026  Heritage Day on Thu 24 Sep
 *   leaveWeek      28 Sep–2 Oct    Leave on Fri 2 Oct
 *   batchWeek      5–9 Oct 2026    A batch slot of micro-tasks
 *   emptyWeek      12–16 Oct 2026  Blocks derived from allocation, no tasks or entries
 *   underusedWeek  19–23 Oct 2026  50% allocation, underutilisation advisory with suggestions
 *
 * Note: the screenshots label the design week "Mon 15 Sept", but 15 Sep 2026 is a
 * Tuesday. The design week here starts on the real Monday, 14 Sep.
 */


import  {
  ReasonCode, 
  SCHEDULER_RULES,
  type AllocationSummary,
  type CalendarEntry,
  type CalendarEntryType,
  type Instant,
  type Issue,
  type LocalDate,
  type Minutes,
  type ProjectBlock,
  type PublicHoliday,
  type Slot,
  type Subtask,
  type Task,
  type UnplacedTaskSummary,
  type WeekContainer,
  type WeekMetadata,
  type Project, 
} from '../types/scheduler.types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const FIXTURE_CONSULTANT_ID = 'consultant-001';
export const FIXTURE_TIMEZONE = 'Africa/Johannesburg';

export interface ProjectSummary  {
  id: Project["id"];
  name: Project["projectName"];
  clientName: Project["clientName"];
}

/** Frozen "now" for the design week: Wed 16 Sep 2026, 09:30 SAST. */
export const FIXTURE_NOW: Instant = '2026-09-16T07:30:00.000Z';

export const PROJECT_IDS = {
  digital: 'proj-digital',
  cloud: 'proj-cloud',
  data: 'proj-data',
} as const;

export const FIXTURE_PROJECTS: ProjectSummary[] = [
  { id: PROJECT_IDS.digital, name: 'Digital Transformation', clientName: 'Barclays PLC' },
  { id: PROJECT_IDS.cloud, name: 'Cloud Migration', clientName: 'HSBC Holdings' },
  { id: PROJECT_IDS.data, name: 'Data Analytics', clientName: 'Standard Bank' },
];

export const FIXTURE_ALLOCATIONS: AllocationSummary[] = [
  { consultantId: FIXTURE_CONSULTANT_ID, projectId: PROJECT_IDS.digital, allocation: 60, periodStart: '2026-09-01' },
  { consultantId: FIXTURE_CONSULTANT_ID, projectId: PROJECT_IDS.cloud, allocation: 30, periodStart: '2026-09-01' },
  { consultantId: FIXTURE_CONSULTANT_ID, projectId: PROJECT_IDS.data, allocation: 10, periodStart: '2026-09-01' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (fixture-only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FIXTURE-ONLY. SAST local date + "HH:mm" → UTC instant.
 * This uses fixed +2h arithmetic, which is only safe because SAST has no DST.
 * Application code must convert time through TimeService, never like this.
 */
const SAST_OFFSET_HOURS = 2;
function at(date: LocalDate, time: string): Instant {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  const hh = Number(time.slice(0, 2));
  const mm = Number(time.slice(3, 5));
  return new Date(Date.UTC(y, m - 1, d, hh - SAST_OFFSET_HOURS, mm)).toISOString();
}

function addDays(date: LocalDate, days: number): LocalDate {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function minutesBetween(start: Instant, end: Instant): Minutes {
  return Math.round((Date.parse(end) - Date.parse(start)) / 60_000);
}

/** SAST local date of an instant (fixture-only, same caveat as `at`). */
function localDateOf(instant: Instant): LocalDate {
  return new Date(Date.parse(instant) + SAST_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

/** SAST minutes-after-midnight of an instant (fixture-only). */
function localMinuteOf(instant: Instant): number {
  const d = new Date(Date.parse(instant) + SAST_OFFSET_HOURS * 3_600_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function roundUp(value: number, unit: number): number {
  return Math.ceil(value / unit) * unit;
}

function weekdays(weekStart: LocalDate): LocalDate[] {
  return [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
}

function allocatedMinutesFor(projectId: string, allocations: AllocationSummary[]): Minutes {
  const a = allocations.find((x) => x.projectId === projectId);
  return a ? Math.round((a.allocation / 100) * SCHEDULER_RULES.contractedMinutes) : 0;
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

function block(
  weekStart: LocalDate,
  dayIndex: number,
  projectId: string,
  start: string,
  end: string,
  allocations: AllocationSummary[] = FIXTURE_ALLOCATIONS,
): ProjectBlock {
  const date = addDays(weekStart, dayIndex);
  const short = projectId.replace('proj-', '');
  return {
    id: `blk-${weekStart}-${short}-${DAY_KEYS[dayIndex]}`,
    projectId,
    placementId: `placement-${short}`,
    // Weekly allocation for the project, repeated on each day's block.
    // Confirm with backend whether this is weekly or per-block.
    allocatedMinutes: allocatedMinutesFor(projectId, allocations),
    start: at(date, start),
    end: at(date, end),
    mobility: 'fluid',
  };
}

function entry(
  id: string,
  type: CalendarEntryType,
  date: LocalDate,
  start: string,
  end: string,
): CalendarEntry {
  return { id, type, start: at(date, start), end: at(date, end), tags: [], origin: 'user' };
}

function lunches(weekStart: LocalDate, start: string, end: string, skip: LocalDate[] = []): CalendarEntry[] {
  return weekdays(weekStart)
    .filter((d) => !skip.includes(d))
    .map((d) => entry(`lunch-${d}`, 'lunch', d, start, end));
}

function slot(id: string, blockId: string, taskIds: string[], date: LocalDate, start: string, end: string, extra: Partial<Slot> = {}): Slot {
  return { id, kind: 'task', taskIds, blockId, start: at(date, start), end: at(date, end), locked: false, ...extra };
}

function subtasks(taskId: string, items: Array<[title: string, estimate: Minutes, done: boolean]>): Subtask[] {
  return items.map(([title, estimate, done], i) => ({ id: `${taskId}-st${i + 1}`, title, estimate, done }));
}

function task(fields: Pick<Task, 'id' | 'projectId' | 'title' | 'tMin' | 'tMax'> & Partial<Task>): Task {
  return {
    urgency: 2,
    complexity: 2,
    status: 'Ready',
    subtasks: [],
    slots: [],
    dependsOn: [],
    placement: fields.slots && fields.slots.length > 0 ? 'placed' : 'unplaced',
    ...fields,
  };
}

/** Assigns daySpan to each of a task's slots (distinct local dates covered). */
function withDaySpan(slots: Slot[]): Slot[] {
  const span = new Set(slots.map((s) => localDateOf(s.start))).size;
  return slots.map((s) => ({ ...s, daySpan: span }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Metadata builder
// Approximates what the backend derives, so the fixtures stay self-consistent.
// Assumptions (confirm with backend):
//  - scheduledMinutes = total ProjectBlock time (what the design's header shows)
//  - availableMinutes = working days × (core window − unpaid lunch) − non-lunch
//    entries on working days
//  - utilization = scheduled / contracted
//  - weekEnd = Sunday
// ─────────────────────────────────────────────────────────────────────────────

interface WeekInput {
  id: string;
  weekStart: LocalDate;
  version: number;
  blocks: ProjectBlock[];
  tasks: Task[];
  entries: CalendarEntry[];
  holidays?: PublicHoliday[];
  allocations?: AllocationSummary[];
  warnings?: Issue[];
  alerts?: Issue[];
  lastCommittedAt?: Instant;
  sourceOfLastChange?: string;
}

const CORE_START_MIN = 8 * 60;
const CORE_END_MIN = 16 * 60;
const DAILY_AUTO_FILLABLE = CORE_END_MIN - CORE_START_MIN - SCHEDULER_RULES.unpaidLunchMin; // 420

function buildMetadata(w: WeekInput): WeekMetadata {
  const holidays = w.holidays ?? [];
  const allocations = w.allocations ?? FIXTURE_ALLOCATIONS;

  const leaveDays = [...new Set(w.entries.filter((e) => e.type === 'leave').map((e) => localDateOf(e.start)))];
  const holidayDates = holidays.map((h) => h.date);
  const workingDates = weekdays(w.weekStart).filter((d) => !holidayDates.includes(d) && !leaveDays.includes(d));

  const obstacleMinutes = w.entries
    .filter((e) => e.type !== 'lunch' && e.type !== 'leave' && workingDates.includes(localDateOf(e.start)))
    .reduce((sum, e) => sum + minutesBetween(e.start, e.end), 0);

  const availableMinutes = workingDates.length * DAILY_AUTO_FILLABLE - obstacleMinutes;
  const scheduledMinutes = w.blocks.reduce((sum, b) => sum + minutesBetween(b.start, b.end), 0);
  const allocatedMinutes = [...new Set(w.blocks.map((b) => b.projectId))].reduce(
    (sum, pid) => sum + allocatedMinutesFor(pid, allocations),
    0,
  );

  const perProject = new Map<string, number>();
  for (const b of w.blocks) perProject.set(b.projectId, (perProject.get(b.projectId) ?? 0) + minutesBetween(b.start, b.end));
  const hasContainerOverflow = [...perProject].some(([pid, mins]) => mins > allocatedMinutesFor(pid, allocations));

  const timed = [...w.blocks, ...w.entries.filter((e) => e.type !== 'leave')];
  const hasOutOfHours = timed.some((x) => localMinuteOf(x.start) < CORE_START_MIN || localMinuteOf(x.end) > CORE_END_MIN);

  const unplaced: UnplacedTaskSummary[] = w.tasks
    .filter((t) => t.placement === 'unplaced')
    .map((t) => ({
      taskId: t.id,
      reason: t.unplacedReason ?? ReasonCode.CONTAINER_FULL,
      neededMinutes: roundUp(t.tMax, SCHEDULER_RULES.minBlockDuration),
      availableMinutes: 0,
      deadline: t.deadline,
    }));

  return {
    contractedMinutes: SCHEDULER_RULES.contractedMinutes,
    availableMinutes,
    allocatedMinutes,
    scheduledMinutes,
    bufferMinutes: availableMinutes - scheduledMinutes,
    utilization: Math.round((scheduledMinutes / SCHEDULER_RULES.contractedMinutes) * 1000) / 1000,
    softCapBreached: scheduledMinutes > SCHEDULER_RULES.contractedMinutes,
    hardCapBreached: scheduledMinutes > SCHEDULER_RULES.hardCapMinutes,
    hasOutOfHours,
    hasWeekend: false,
    hasContainerOverflow,
    hasUnresolvedRollover: w.tasks.some((t) => t.carriedOver && t.placement === 'unplaced'),
    weekStart: w.weekStart,
    weekEnd: addDays(w.weekStart, 6),
    workingDays: [...SCHEDULER_RULES.workingDays],
    publicHolidays: holidayDates,
    leaveDays,
    lastCommittedAt: w.lastCommittedAt,
    sourceOfLastChange: w.sourceOfLastChange,
    warnings: w.warnings ?? [],
    alerts: w.alerts ?? [],
    unplaced,
  };
}

function makeWeek(w: WeekInput): WeekContainer {
  return {
    id: w.id,
    consultantId: FIXTURE_CONSULTANT_ID,
    timezone: FIXTURE_TIMEZONE,
    weekStart: w.weekStart,
    version: w.version,
    blocks: w.blocks,
    tasks: w.tasks,
    entries: w.entries,
    holidays: w.holidays ?? [],
    metadata: buildMetadata(w),
  };
}

/** Healthy in-core-hours blocks: Digital 08–12, Cloud 13–15, Data 15–16 on Mon/Wed/Fri. */
function standardBlocks(weekStart: LocalDate, skipDays: number[] = []): ProjectBlock[] {
  const out: ProjectBlock[] = [];
  for (let i = 0; i < 5; i++) {
    if (skipDays.includes(i)) continue;
    out.push(block(weekStart, i, PROJECT_IDS.digital, '08:00', '12:00'));
    out.push(block(weekStart, i, PROJECT_IDS.cloud, '13:00', '15:00'));
    if (i % 2 === 0) out.push(block(weekStart, i, PROJECT_IDS.data, '15:00', '16:00'));
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Design week — 14–18 Sep 2026 (matches the screenshots)
// ─────────────────────────────────────────────────────────────────────────────

const DW = '2026-09-14';
const [dMon, dTue, dWed, dThu, dFri] = weekdays(DW) as [LocalDate, LocalDate, LocalDate, LocalDate, LocalDate];

// Day totals match the pills in the design: 8.4 / 9.2 / 8.4 / 8.6 / 9.6h (= 44.2h).
// The design header says 44.3h — the pills and header don't add up in the mock-up itself.
// Data Analytics runs past 16:00, and every day is over the 8h daily max; this is
// deliberately the overloaded state the design shows.
const designBlocks: ProjectBlock[] = [
  ...[0, 1, 2, 3, 4].flatMap((i) => [
    block(DW, i, PROJECT_IDS.digital, '08:00', '12:45'), // 4.75h
    block(DW, i, PROJECT_IDS.cloud, '13:00', '15:24'), // 2.4h
  ]),
  block(DW, 0, PROJECT_IDS.data, '15:30', '16:45'),
  block(DW, 1, PROJECT_IDS.data, '15:30', '17:33'),
  block(DW, 2, PROJECT_IDS.data, '15:30', '16:45'),
  block(DW, 3, PROJECT_IDS.data, '15:30', '16:57'),
  block(DW, 4, PROJECT_IDS.data, '15:30', '17:57'),
];

const blk = (project: 'digital' | 'cloud' | 'data', day: (typeof DAY_KEYS)[number]) => `blk-${DW}-${project}-${day}`;

const designTasks: Task[] = [
  // ── Digital Transformation block tasks (detail panel: 1/4 complete, 3 overdue)
  task({
    id: 'task-sef',
    projectId: PROJECT_IDS.digital,
    title: 'Stakeholder Engagement Framework',
    tMin: 180,
    tMax: 300,
    deadline: at('2026-09-09', '17:00'), // 7 days overdue
    urgency: 4,
    complexity: 2,
    status: 'InProgress',
    subtasks: subtasks('task-sef', [
      ['Map stakeholder groups', 60, true],
      ['Draft engagement matrix', 90, true],
      ['Define communication cadence', 60, false],
      ['Review with sponsor', 90, false],
    ]),
    slots: withDaySpan([
      slot('slot-sef-1', blk('digital', 'mon'), ['task-sef'], dMon, '08:00', '10:00'),
      slot('slot-sef-2', blk('digital', 'tue'), ['task-sef'], dTue, '08:00', '10:00'),
      slot('slot-sef-3', blk('digital', 'wed'), ['task-sef'], dWed, '08:00', '09:00'),
    ]),
  }),
  task({
    id: 'task-dis',
    projectId: PROJECT_IDS.digital,
    title: 'Discovery Interview Synthesis',
    tMin: 45,
    tMax: 60,
    urgency: 2,
    complexity: 1,
    status: 'Done',
    subtasks: subtasks('task-dis', [
      ['Collate interview notes', 30, true],
      ['Write key findings', 30, true],
    ]),
    slots: withDaySpan([slot('slot-dis-1', blk('digital', 'mon'), ['task-dis'], dMon, '10:00', '11:00')]),
  }),
  task({
    id: 'task-cspa',
    projectId: PROJECT_IDS.digital,
    title: 'Current State Process Assessment',
    tMin: 240,
    tMax: 360,
    deadline: at('2026-09-11', '17:00'), // 5 days overdue
    urgency:3,
    complexity: 3,
    subtasks: subtasks('task-cspa', [
      ['Document as-is processes', 120, false],
      ['Identify pain points', 120, false],
      ['Prioritise improvement areas', 120, false],
    ]),
    slots: withDaySpan([
      slot('slot-cspa-1', blk('digital', 'mon'), ['task-cspa'], dMon, '11:00', '12:45'),
      slot('slot-cspa-2', blk('digital', 'tue'), ['task-cspa'], dTue, '10:00', '12:45'),
      slot('slot-cspa-3', blk('digital', 'wed'), ['task-cspa'], dWed, '09:00', '10:30'),
    ]),
  }),
  task({
    id: 'task-fsom',
    projectId: PROJECT_IDS.digital,
    title: 'Future State Operating Model',
    tMin: 180,
    tMax: 240,
    deadline: at('2026-09-14', '17:00'), // 2 days overdue
    urgency: 3,
    complexity: 3,
    subtasks: subtasks('task-fsom', [
      ['Draft target operating model', 120, false],
      ['Validate with process owners', 120, false],
    ]),
    slots: withDaySpan([slot('slot-fsom-1', blk('digital', 'thu'), ['task-fsom'], dThu, '08:00', '12:00')]),
  }),

  // ── Cloud Migration (rollover icon in the design → carried-over, partially rolled)
  task({
    id: 'task-scc',
    projectId: PROJECT_IDS.cloud,
    title: 'Security Compliance Checklist',
    tMin: 360,
    tMax: 432,
    deadline: at('2026-09-18', '23:59'),
    urgency: 3,
    complexity: 2,
    status: 'InProgress',
    carriedOver: true,
    subtasks: subtasks('task-scc', [
      ['Inventory workloads', 72, true],
      ['Map controls to framework', 72, true],
      ['Gap analysis', 144, false],
      ['Remediation plan', 144, false],
    ]),
    slots: withDaySpan([
      // Locked original slot covering the completed subtasks (kept for audit)
      slot('slot-scc-1', blk('cloud', 'mon'), ['task-scc'], dMon, '13:00', '15:24', {
        locked: true,
        subtaskIds: ['task-scc-st1', 'task-scc-st2'],
      }),
      slot('slot-scc-2', blk('cloud', 'tue'), ['task-scc'], dTue, '13:00', '15:24', { subtaskIds: ['task-scc-st3'] }),
      slot('slot-scc-3', blk('cloud', 'wed'), ['task-scc'], dWed, '13:00', '15:24', { subtaskIds: ['task-scc-st4'] }),
    ]),
  }),
  task({
    id: 'task-wmw',
    projectId: PROJECT_IDS.cloud,
    title: 'Workload Migration Wave 1',
    tMin: 240,
    tMax: 288,
    deadline: at('2026-09-25', '23:59'),
    urgency: 2,
    complexity: 3,
    slots: withDaySpan([
      slot('slot-wmw-1', blk('cloud', 'thu'), ['task-wmw'], dThu, '13:00', '15:24'),
      slot('slot-wmw-2', blk('cloud', 'fri'), ['task-wmw'], dFri, '13:00', '15:24'),
    ]),
  }),

  // ── Data Analytics
  task({
    id: 'task-dgp',
    projectId: PROJECT_IDS.data,
    title: 'Data Governance Policy',
    tMin: 240,
    tMax: 273,
    urgency: 2,
    complexity: 2,
    slots: withDaySpan([
      slot('slot-dgp-1', blk('data', 'mon'), ['task-dgp'], dMon, '15:30', '16:45'),
      slot('slot-dgp-2', blk('data', 'tue'), ['task-dgp'], dTue, '15:30', '17:33'),
      slot('slot-dgp-3', blk('data', 'wed'), ['task-dgp'], dWed, '15:30', '16:45'),
    ]),
  }),
  task({
    id: 'task-dlm',
    projectId: PROJECT_IDS.data,
    title: 'Data Lineage Mapping',
    tMin: 180,
    tMax: 234,
    urgency: 2,
    complexity: 2,
    slots: withDaySpan([
      slot('slot-dlm-1', blk('data', 'thu'), ['task-dlm'], dThu, '15:30', '16:57'),
      slot('slot-dlm-2', blk('data', 'fri'), ['task-dlm'], dFri, '15:30', '17:57'),
    ]),
  }),

  // ── Backlog: 7 unplaced (3 Digital, 2 Cloud, 2 Data) — matches "Backlog 7"
  task({
    id: 'task-npba',
    projectId: PROJECT_IDS.cloud,
    title: 'Network Performance Baseline Audit',
    tMin: 180,
    tMax: 360,
    deadline: at('2026-10-01', '23:59'),
    urgency: 2,
    complexity: 2,
    unplacedReason: ReasonCode.CONTAINER_FULL,
  }),
  task({
    id: 'task-q4tr',
    projectId: PROJECT_IDS.digital,
    title: 'Q4 Transformation Roadmap',
    tMin: 240,
    tMax: 480,
    deadline: at('2026-10-03', '23:59'),
    urgency: 2,
    complexity: 2,
    unplacedReason: ReasonCode.CONTAINER_FULL,
  }),
  task({
    id: 'task-mler',
    projectId: PROJECT_IDS.data,
    title: 'ML Model Evaluation Report',
    tMin: 300,
    tMax: 540,
    deadline: at('2026-10-07', '23:59'),
    urgency: 2,
    complexity: 2,
    unplacedReason: ReasonCode.CONTAINER_FULL,
  }),
  task({
    id: 'task-cmcp',
    projectId: PROJECT_IDS.digital,
    title: 'Change Management Communications Plan',
    tMin: 180,
    tMax: 300,
    deadline: at('2026-10-09', '23:59'),
    urgency: 2,
    complexity: 2,
    unplacedReason: ReasonCode.CONTAINER_FULL,
  }),
  task({
    id: 'task-brt',
    projectId: PROJECT_IDS.digital,
    title: 'Benefits Realisation Tracker',
    tMin: 120,
    tMax: 240,
    deadline: at('2026-10-12', '23:59'),
    urgency: 1,
    complexity: 2,
    unplacedReason: ReasonCode.DAY_SPAN_LIMIT,
  }),
  task({
    id: 'task-drr',
    projectId: PROJECT_IDS.cloud,
    title: 'Disaster Recovery Runbook',
    tMin: 240,
    tMax: 360,
    deadline: at('2026-09-17', '12:00'),
    urgency: 3,
    complexity: 2,
    unplacedReason: ReasonCode.DEADLINE_INFEASIBLE,
  }),
  task({
    id: 'task-dqds',
    projectId: PROJECT_IDS.data,
    title: 'Data Quality Dashboard Spec',
    tMin: 120,
    tMax: 180,
    urgency: 1,
    complexity: 2,
    unplacedReason: ReasonCode.CONTAINER_FULL,
  }),
];

export const designWeek: WeekContainer = makeWeek({
  id: 'week-2026-09-14',
  weekStart: DW,
  version: 12,
  blocks: designBlocks,
  tasks: designTasks,
  entries: [
    entry('entry-standup-mon', 'meeting', dMon, '09:00', '09:15'), // "Team Standup"
    ...lunches(DW, '12:45', '13:00'),
  ],
  lastCommittedAt: at(dWed, '07:30'),
  sourceOfLastChange: 'DailyTick',
  // Which issues land in `alerts` vs `warnings` isn't specified by the docs —
  // here the banner-worthy one ("Significant overload") is in alerts.
  alerts: [
    {
      level: 'warning',
      code: ReasonCode.SOFT_CAP_BREACH,
      message: '44.2h allocated vs 40h contract — 4.2h over. Drag blocks to balance.',
      persistent: true,
    },
  ],
  warnings: [
    {
      level: 'warning',
      code: ReasonCode.CONTAINER_OVERFLOW,
      message: 'Data Analytics has more scheduled time than its 10% allocation (4h).',
      entityIds: [PROJECT_IDS.data],
    },
    {
      level: 'warning',
      code: ReasonCode.UNPLACED_TASKS,
      message: '7 tasks could not be placed this week.',
      entityIds: ['task-npba', 'task-q4tr', 'task-mler', 'task-cmcp', 'task-brt', 'task-drr', 'task-dqds'],
    },
    {
      level: 'warning',
      code: ReasonCode.DEADLINE_INFEASIBLE,
      message: "Task 'Disaster Recovery Runbook' can't complete before its deadline (needs 6h, only 0h available before Thu 12:00).",
      entityIds: ['task-drr'],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Holiday week — 21–25 Sep 2026, Heritage Day on Thu 24 Sep
// ─────────────────────────────────────────────────────────────────────────────

const HW = '2026-09-21';
const [hMon, hTue, hWed, , hFri] = weekdays(HW) as [LocalDate, LocalDate, LocalDate, LocalDate, LocalDate];
const hBlk = (project: 'digital' | 'cloud' | 'data', day: (typeof DAY_KEYS)[number]) => `blk-${HW}-${project}-${day}`;

export const HERITAGE_DAY: PublicHoliday = { id: 'ph-2026-09-24', date: '2026-09-24', name: 'Heritage Day' };

export const holidayWeek: WeekContainer = makeWeek({
  id: 'week-2026-09-21',
  weekStart: HW,
  version: 3,
  holidays: [HERITAGE_DAY],
  blocks: standardBlocks(HW, [3]), // no blocks on Thursday
  entries: [
    ...lunches(HW, '12:00', '13:00', ['2026-09-24']),
    entry('entry-steerco', 'meeting', hTue, '10:00', '11:00'),
  ],
  tasks: [
    task({
      id: 'task-hw-proposal',
      projectId: PROJECT_IDS.digital,
      title: 'Operating Model Proposal',
      tMin: 300,
      tMax: 360,
      deadline: at('2026-09-25', '17:00'),
      urgency: 3,
      complexity: 3,
      status: 'InProgress',
      subtasks: subtasks('task-hw-proposal', [
        ['Outline', 120, true],
        ['Draft sections', 120, false],
        ['Final review', 120, false],
      ]),
      slots: withDaySpan([
        slot('slot-hwp-1', hBlk('digital', 'mon'), ['task-hw-proposal'], hMon, '08:00', '12:00'),
        slot('slot-hwp-2', hBlk('digital', 'wed'), ['task-hw-proposal'], hWed, '08:00', '10:00'),
      ]),
    }),
    task({
      id: 'task-hw-cutover',
      projectId: PROJECT_IDS.cloud,
      title: 'Cutover Rehearsal Plan',
      tMin: 180,
      tMax: 240,
      urgency: 2,
      complexity: 2,
      // Slid off Thursday (holiday) onto Tue + Fri
      slots: withDaySpan([
        slot('slot-hwc-1', hBlk('cloud', 'tue'), ['task-hw-cutover'], hTue, '13:00', '15:00'),
        slot('slot-hwc-2', hBlk('cloud', 'fri'), ['task-hw-cutover'], hFri, '13:00', '15:00'),
      ]),
    }),
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Leave week — 28 Sep–2 Oct 2026, leave on Fri 2 Oct
// ─────────────────────────────────────────────────────────────────────────────

const LW = '2026-09-28';
const [lMon, lTue, , lThu, lFri] = weekdays(LW) as [LocalDate, LocalDate, LocalDate, LocalDate, LocalDate];
const lBlk = (project: 'digital' | 'cloud' | 'data', day: (typeof DAY_KEYS)[number]) => `blk-${LW}-${project}-${day}`;

export const leaveWeek: WeekContainer = makeWeek({
  id: 'week-2026-09-28',
  weekStart: LW,
  version: 2,
  blocks: standardBlocks(LW, [4]), // no blocks on Friday
  entries: [
    ...lunches(LW, '12:00', '13:00', [lFri]),
    entry('entry-leave-fri', 'leave', lFri, '08:00', '16:00'),
    entry('entry-training-tue', 'training', lTue, '15:00', '16:00'),
  ],
  tasks: [
    task({
      id: 'task-lw-roadmap',
      projectId: PROJECT_IDS.digital,
      title: 'Q4 Transformation Roadmap',
      tMin: 240,
      tMax: 480,
      deadline: at('2026-10-03', '23:59'),
      urgency: 3,
      complexity: 2,
      slots: withDaySpan([
        slot('slot-lwr-1', lBlk('digital', 'mon'), ['task-lw-roadmap'], lMon, '08:00', '12:00'),
        slot('slot-lwr-2', lBlk('digital', 'tue'), ['task-lw-roadmap'], lTue, '08:00', '12:00'),
      ]),
    }),
    task({
      id: 'task-lw-audit',
      projectId: PROJECT_IDS.cloud,
      title: 'Network Performance Baseline Audit',
      tMin: 180,
      tMax: 360,
      deadline: at('2026-10-01', '23:59'),
      urgency: 2,
      complexity: 2,
      slots: withDaySpan([
        slot('slot-lwa-1', lBlk('cloud', 'mon'), ['task-lw-audit'], lMon, '13:00', '15:00'),
        slot('slot-lwa-2', lBlk('cloud', 'thu'), ['task-lw-audit'], lThu, '13:00', '15:00'),
      ]),
    }),
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Batch week — 5–9 Oct 2026, four micro-tasks batched into one slot
// ─────────────────────────────────────────────────────────────────────────────

const BW = '2026-10-05';
const [bMon, bTue] = weekdays(BW) as [LocalDate, LocalDate, LocalDate, LocalDate, LocalDate];
const bBlk = (project: 'digital' | 'cloud' | 'data', day: (typeof DAY_KEYS)[number]) => `blk-${BW}-${project}-${day}`;

const microTaskIds = ['task-bw-m1', 'task-bw-m2', 'task-bw-m3', 'task-bw-m4'];
const microTasks: Array<[id: string, title: string, tMax: Minutes]> = [
  ['task-bw-m1', 'Approve firewall change request', 15],
  ['task-bw-m2', 'Reply to vendor licensing query', 20],
  ['task-bw-m3', 'Update migration tracker', 10],
  ['task-bw-m4', 'Review IAM role naming', 25],
];
// Sum of tMax = 70 min → batch slot rounds up to 120 min (next 60-min increment).
const batchSlot: Slot = {
  id: 'slot-bw-batch-tue',
  kind: 'batch',
  taskIds: microTaskIds,
  blockId: bBlk('cloud', 'tue'),
  start: at(bTue, '13:00'),
  end: at(bTue, '15:00'),
  locked: false,
  daySpan: 1,
};

export const batchWeek: WeekContainer = makeWeek({
  id: 'week-2026-10-05',
  weekStart: BW,
  version: 1,
  blocks: standardBlocks(BW),
  entries: lunches(BW, '12:00', '13:00'),
  tasks: [
    ...microTasks.map(([id, title, tMax]) =>
      task({ id, projectId: PROJECT_IDS.cloud, title, tMin: tMax, tMax, urgency: 2, complexity: 1, slots: [batchSlot] }),
    ),
    task({
      id: 'task-bw-design',
      projectId: PROJECT_IDS.digital,
      title: 'Service Blueprint Design',
      tMin: 180,
      tMax: 240,
      urgency: 2,
      complexity: 3,
      slots: withDaySpan([slot('slot-bwd-1', bBlk('digital', 'mon'), ['task-bw-design'], bMon, '08:00', '12:00')]),
    }),
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Empty week — 12–16 Oct 2026
// Blocks still exist (derived from allocation); no tasks, no calendar entries.
// ─────────────────────────────────────────────────────────────────────────────

export const emptyWeek: WeekContainer = makeWeek({
  id: 'week-2026-10-12',
  weekStart: '2026-10-12',
  version: 1,
  blocks: standardBlocks('2026-10-12'),
  entries: [],
  tasks: [],
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Underused week — 19–23 Oct 2026
// Consultant only 50% allocated (Digital), 20h scheduled against ~35h available.
// ─────────────────────────────────────────────────────────────────────────────

const UW = '2026-10-19';
const [uMon, uTue] = weekdays(UW) as [LocalDate, LocalDate, LocalDate, LocalDate, LocalDate];
const underusedAllocations: AllocationSummary[] = [
  { consultantId: FIXTURE_CONSULTANT_ID, projectId: PROJECT_IDS.digital, allocation: 50, periodStart: '2026-10-19' },
];
const underusedBlocks = [0, 1, 2, 3, 4].map((i) => block(UW, i, PROJECT_IDS.digital, '08:00', '12:00', underusedAllocations));

export const underusedWeek: WeekContainer = makeWeek({
  id: 'week-2026-10-19',
  weekStart: UW,
  version: 1,
  allocations: underusedAllocations,
  blocks: underusedBlocks,
  entries: lunches(UW, '12:00', '13:00'),
  tasks: [
    task({
      id: 'task-uw-review',
      projectId: PROJECT_IDS.digital,
      title: 'Programme Health Review',
      tMin: 180,
      tMax: 240,
      urgency: 2,
      complexity: 2,
      slots: withDaySpan([
        slot('slot-uwr-1', `blk-${UW}-digital-mon`, ['task-uw-review'], uMon, '08:00', '10:00'),
        slot('slot-uwr-2', `blk-${UW}-digital-tue`, ['task-uw-review'], uTue, '08:00', '10:00'),
      ]),
    }),
  ],
  alerts: [
    {
      level: 'info',
      code: ReasonCode.UNDERUTILISED,
      message: 'You have about 9h of unused capacity this week beyond your buffer.',
      suggestions: [
        {
          code: 'PULL_FORWARD',
          label: "Pull forward 'Q1 Planning Pack' from next week (4h)",
          payload: { taskIds: ['task-next-q1pack'], minutes: 240 },
        },
        {
          code: 'EXTEND_BLOCK',
          label: 'Extend Digital Transformation by 2h',
          payload: { projectId: PROJECT_IDS.digital, minutes: 120 },
        },
        {
          code: 'COPY_SUMMARY',
          label: 'Copy summary for your resource manager',
          payload: { availableMinutes: 2100, allocatedMinutes: 1200, scheduledMinutes: 1200, bufferMinutes: 900 },
        },
      ],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Lookup — handy for the in-memory API later
// ─────────────────────────────────────────────────────────────────────────────

export const FIXTURE_WEEKS: Record<LocalDate, WeekContainer> = {
  [designWeek.weekStart]: designWeek,
  [holidayWeek.weekStart]: holidayWeek,
  [leaveWeek.weekStart]: leaveWeek,
  [batchWeek.weekStart]: batchWeek,
  [emptyWeek.weekStart]: emptyWeek,
  [underusedWeek.weekStart]: underusedWeek,
};

export const FIXTURE_PUBLIC_HOLIDAYS: PublicHoliday[] = [HERITAGE_DAY];