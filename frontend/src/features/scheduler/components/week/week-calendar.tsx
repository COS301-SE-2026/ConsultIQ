import { useState } from "react";
import { fromZonedTime } from "date-fns-tz";
import {
    DndContext,
    type DragEndEvent,
    type DragMoveEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import TimeAxis from "./time-axis";
import Dayheader from "./day-header";
import DayColumn from "./day-column";
import ProjectBlock from "./project-block";
import TaskSlot from "./task-slot";
import BatchSlot from "./batch-slot";
import CalendarEntry from "./calendar-entry";
import NowIndicator from "./now-indicator";
import DropGhost from "./drag-ghost";
import OutOfHoursConfirmDialog from "./out-of-hours-dialog";
import CalendarEntryForm from "../calendar-entry-form";
import { getProjectColour } from "./project-colour";
import { type BacklogProjectOption } from "../backlog-panel";
import type {
    WeekContainer,
    Interval,
    TaskStatus,
    CalendarEntry as CalendarEntryData,
    CalendarEntryDto,
    ProjectBlock as ProjectBlockData,
    SetTaskStatusDto,
} from "../../types/scheduler.types";
import {
    instantToLocalTime,
    instantToLocalDate,
    timeToMinutes,
    minutesToTime,
    ROW_HEIGHT_PX,
    blockTop,
    blockHeight,
    isIntervalOutOfHours,
    DAY_START_HOUR,
    DAY_END_HOUR,
    isWeekendInstant,
    CORE_START_TIME,
} from "../../utils/scheduler.utils";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface GhostState {
    date: string;
    startMin: number;
    durationMin: number;
    colour: string;
    slotId?: string;
}

interface AwaitingConfirmation {
    kind: "move" | "resize" | "slot";
    id: string;
    to: Interval;
}

type EntryFormState = { mode: "create" } | { mode: "edit"; entry: CalendarEntryData } | null;

export interface WeekCalendarProps {
    readonly weekData: WeekContainer;
    readonly projects: BacklogProjectOption[];
    readonly createEntryRequested?: boolean;
    readonly onCreateEntryDone?: () => void;
    readonly onMoveBlock: (blockId: string, to: Interval, confirmedOverride: boolean) => Promise<boolean>;
    readonly onResizeBlock: (blockId: string, to: Interval, confirmedOverride: boolean) => Promise<boolean>;
    readonly onPinBlock: (blockId: string, pinned: boolean) => Promise<boolean>;
    readonly onMoveSlot: (slotId: string, to: Interval, confirmedOverride: boolean) => Promise<boolean>;
    readonly onSetStatus: (taskId: string, dto: SetTaskStatusDto) => void | Promise<void>;
    readonly onSaveEntry: (dto: CalendarEntryDto) => Promise<boolean>;
    readonly onDeleteEntry: (entryId: string) => Promise<boolean>;
}

function addDays(date: string, days: number): string {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function scrollToCoreHours(el: HTMLDivElement | null) {
    if (el) el.scrollTop = blockTop(CORE_START_TIME);
}

// "slot:abc" -> { kind: "slot", id: "abc" }
function parseDragId(dragId: string) {
    const i = dragId.indexOf(":");
    return { kind: dragId.slice(0, i) as "block" | "slot", id: dragId.slice(i + 1) };
}

function withBlock(w: WeekContainer, blockId: string, patch: Partial<ProjectBlockData>): WeekContainer {
    return { ...w, blocks: w.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) };
}

// A batch slot appears on every task in the batch, so update it everywhere
function withSlot(w: WeekContainer, slotId: string, to: Interval): WeekContainer {
    return {
        ...w,
        tasks: w.tasks.map((t) => ({
            ...t,
            slots: t.slots.map((s) => (s.id === slotId ? { ...s, ...to } : s)),
        })),
    };
}

export default function WeekCalendar({
    weekData,
    projects,
    createEntryRequested = false,
    onCreateEntryDone,
    onMoveBlock,
    onResizeBlock,
    onPinBlock,
    onMoveSlot,
    onSetStatus,
    onSaveEntry,
    onDeleteEntry,
}: WeekCalendarProps) {
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [week, setWeek] = useState(weekData);
    const [entryForm, setEntryForm] = useState<EntryFormState>(null);
    const [ghost, setGhost] = useState<GhostState | null>(null);
    const [awaiting, setAwaiting] = useState<AwaitingConfirmation | null>(null);
    const [showWeekend, setShowWeekend] = useState(week.metadata.hasWeekend);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, {
            keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
        }),
    );


    const activeForm: EntryFormState = entryForm ?? (createEntryRequested ? { mode: "create" } : null);

    // Earliest minute of the day a drop may start: now (rounded up to 15 min) today, midnight otherwise
    function earliestStartMin(date: string): number {
        if (date !== today) return DAY_START_HOUR * 60;
        const nowMin = timeToMinutes(instantToLocalTime(new Date().toISOString(), week.timezone));
        return Math.ceil(nowMin / 15) * 15;
    }
    

    function closeEntryForm() {
        setEntryForm(null);
        onCreateEntryDone?.();
    }
    async function handleSaveEntry(dto: CalendarEntryDto) {
        try {
            if (await onSaveEntry(dto)) closeEntryForm(); // on failure the form stays open
        } catch {
            // network error: keep the form open so nothing typed is lost
        }
    }

    async function handleDeleteEntry(entryId: string) {
        try {
            if (await onDeleteEntry(entryId)) closeEntryForm();
        } catch {
            // network error: keep the form open
        }
    }

    // ─── Task status ───

    function changeStatus(taskId: string, status: TaskStatus) {
        void onSetStatus(taskId, { status, expectedVersion: week.version });
    }
    // ─── Manual placement ───

   function applyOptimistic(patch: (w: WeekContainer) => WeekContainer, save: Promise<boolean>) {
        const previous = week;
        setWeek(patch(previous));
        save
            .then((ok) => {
                if (!ok) setWeek(previous);
            })
            .catch(() => setWeek(previous));
    }

    function applyChange(c: AwaitingConfirmation, confirmedOverride = false) {
        if (c.kind === "slot") {
            applyOptimistic((w) => withSlot(w, c.id, c.to), onMoveSlot?.(c.id, c.to, confirmedOverride));
        } else if (c.kind === "move") {
            applyOptimistic((w) => withBlock(w, c.id, c.to), onMoveBlock?.(c.id, c.to, confirmedOverride));
        } else {
            applyOptimistic(
                (w) => withBlock(w, c.id, { ...c.to, userSized: true }),
                onResizeBlock?.(c.id, c.to, confirmedOverride),
            );
        }
    }

    function requestChange(c: AwaitingConfirmation) {
        const needsConfirm =
            isIntervalOutOfHours(c.to, week.timezone) || isWeekendInstant(c.to.start, week.timezone);
        if (needsConfirm) setAwaiting(c);
        else applyChange(c);
    }

    function handleTogglePin(blockId: string, pinned: boolean) {
        applyOptimistic(
            (w) => withBlock(w, blockId, { mobility: pinned ? "pinned" : "fluid" }),
            onPinBlock?.(blockId, pinned),
        );
    }

    // ─── Dragging ───

    function dragSubject(dragId: string) {
        const { kind, id } = parseDragId(dragId);
        if (kind === "slot") {
            const task = week.tasks.find((t) => t.slots.some((s) => s.id === id))!;
            const slot = task.slots.find((s) => s.id === id)!;
            return { start: slot.start, end: slot.end, projectId: task.projectId };
        }
        const b = week.blocks.find((x) => x.id === id)!;
        return { start: b.start, end: b.end, projectId: b.projectId };
    }

    function snappedStart(dragId: string, deltaY: number) {
        const subject = dragSubject(dragId);
        const originalMin = timeToMinutes(instantToLocalTime(subject.start, week.timezone));
        const durationMin = (Date.parse(subject.end) - Date.parse(subject.start)) / 60_000;
        const moved = originalMin + Math.round(((deltaY / ROW_HEIGHT_PX) * 60) / 15) * 15;
        const startMin = Math.max(DAY_START_HOUR * 60, Math.min(DAY_END_HOUR * 60 - durationMin, moved));
        return { startMin, durationMin, colour: getProjectColour(subject.projectId).color };
    }

    // Same rule as the backend: a slot can't share any time with another slot or entry
    function ghostClashes(g: GhostState): boolean {
        if (!g.slotId) return false; // blocks can sit under slots and entries
        const start = fromZonedTime(`${g.date}T${minutesToTime(g.startMin)}:00`, week.timezone).getTime();
        const end = start + g.durationMin * 60_000;
        const others = [...week.tasks.flatMap((t) => t.slots), ...week.entries].filter((e) => e.id !== g.slotId);
        return others.some((e) => Date.parse(e.start) < end && start < Date.parse(e.end));
    }

    // Where the dragged item would land, or null if it can't land there
    function dropTarget(dragId: string, date: string, deltaY: number) {
        const snapped = snappedStart(dragId, deltaY);
        const startMin = Math.max(snapped.startMin, earliestStartMin(date));
        if (startMin + snapped.durationMin > DAY_END_HOUR * 60) return null; // would run past midnight
        return { ...snapped, startMin };
    }

    function handleDragMove({ active, over, delta }: DragMoveEvent) {
        const target = over ? dropTarget(String(active.id), String(over.id), delta.y) : null;
        if (!over || !target) {
            if (ghost) setGhost(null);
            return;
        }

        const { kind, id } = parseDragId(String(active.id));
        const next: GhostState = {
            date: String(over.id),
            ...target,
            slotId: kind === "slot" ? id : undefined,
        };
        if (ghost?.date === next.date && ghost.startMin === next.startMin) return;
        setGhost(next);
    }

    function handleDragEnd({ active, over, delta }: DragEndEvent) {
        setGhost(null);
        const target = over ? dropTarget(String(active.id), String(over.id), delta.y) : null;
        if (!over || !target) return;

        const { kind, id } = parseDragId(String(active.id));
        const start = fromZonedTime(`${over.id}T${minutesToTime(target.startMin)}:00`, week.timezone);
        const end = new Date(start.getTime() + target.durationMin * 60_000);

        requestChange({
            kind: kind === "slot" ? "slot" : "move",
            id,
            to: { start: start.toISOString(), end: end.toISOString() },
        });
    }

    // ─── Derived data ───

    const today = instantToLocalDate(new Date().toISOString(), week.timezone);

    // A batch slot appears on every task in the batch, so de-duplicate by id
    const allSlots = [...new Map(week.tasks.flatMap((t) => t.slots).map((s) => [s.id, s])).values()];

    const days = DAY_NAMES.map((name, i) => {
        const date = addDays(week.weekStart, i);
        const holiday = week.holidays.find((h) => h.date === date);

        const minutes = allSlots
            .filter((s) => instantToLocalDate(s.start, week.timezone) === date)
            .reduce((sum, s) => sum + (Date.parse(s.end) - Date.parse(s.start)) / 60_000, 0);

        return {
            name,
            date,
            isWeekend: i >= 5,
            isToday: date === today,
            isPast: date < today,
            isHoliday: !!holiday,
            holidayName: holiday?.name,
            totalHours: minutes / 60,
        };
    }).filter((d) => showWeekend || !d.isWeekend);

    return (
        <div className="flex flex-col gap-2 w-full min-w-0 flex-1 min-h-0">
            <button
                type="button"
                className="self-start px-3 py-1 text-sm rounded border border-slate-300"
                onClick={() => setShowWeekend((s) => !s)}
            >
                {showWeekend ? "Hide weekend" : "Show weekend"}
            </button>

            <div ref={scrollToCoreHours} className="isolate flex-1 min-h-0 overflow-auto border border-slate-200">
                <div style={{ minWidth: 64 + days.length * 112 }}>
                    {/* Header row: sticks to the top while scrolling */}
                    <div className="sticky top-0 z-40 flex bg-white border-b border-slate-200">
                        <div className="w-16 flex-none sticky left-0 bg-white" />
                        {days.map((d) => (
                            <Dayheader
                                key={d.date}
                                dayOfWeek={d.name}
                                date={d.date.slice(8, 10)}
                                isToday={d.isToday}
                                isHoliday={d.isHoliday}
                                holidayName={d.holidayName}
                                totalHours={d.totalHours}
                            />
                        ))}
                    </div>

                    <DndContext
                        sensors={sensors}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                        onDragCancel={() => setGhost(null)}
                    >
                        <div className="flex">
                            <TimeAxis />
                            {days.map((d) => (
                                <DayColumn key={d.date} date={d.date} isHoliday={d.isHoliday} isWeekend={d.isWeekend} isPast={d.isPast}>
                                    {/* Project blocks: the background for each project's time */}
                                    {week.blocks
                                        .filter((b) => instantToLocalDate(b.start, week.timezone) === d.date)
                                        .map((b) => {
                                                const project: BacklogProjectOption = projects.find((p) => p.id === b.projectId) ?? {
                                                id: b.projectId,
                                                label: b.projectId,
                                                clientName: "",
                                                color: getProjectColour(b.projectId).color,
                                            };
                                            return (
                                                <ProjectBlock
                                                    key={b.id}
                                                    earliestStartMin={earliestStartMin(d.date)}
                                                    block={b}
                                                    tasks={week.tasks}
                                                    project={project}
                                                    timezone={week.timezone}
                                                    selected={selectedBlockId === b.id}
                                                    onClick={() => setSelectedBlockId(b.id)}
                                                    onResize={(blockId, to) => requestChange({ kind: "resize", id: blockId, to })}
                                                    onTogglePin={(pinned) => handleTogglePin(b.id, pinned)}
                                                />
                                            );
                                        })}

                                    {/* Slots: drawn at their real times, on top of the blocks */}
                                    {allSlots
                                        .filter((s) => instantToLocalDate(s.start, week.timezone) === d.date)
                                        .map((s) => {
                                            const task = week.tasks.find((t) => s.taskIds.includes(t.id));
                                            if (!task) return null;
                                            const colour = getProjectColour(task.projectId).color;
                                            const start = instantToLocalTime(s.start, week.timezone);
                                            const end = instantToLocalTime(s.end, week.timezone);

                                            return (
                                                <div
                                                    key={s.id}
                                                    className="absolute left-2 right-1 rounded-md overflow-hidden bg-white shadow-sm"
                                                    style={{
                                                        top: blockTop(start),
                                                        height: Math.max(blockHeight(start, end), 18),
                                                        borderLeft: `3px solid ${colour}`,
                                                        zIndex: 6,
                                                    }}
                                                >
                                                    {s.kind === "batch" ? (
                                                        <BatchSlot slot={s} tasks={week.tasks} color={colour} />
                                                    ) : (
                                                        <TaskSlot
                                                            slot={s}
                                                            task={task}
                                                            timezone={week.timezone}
                                                            color={colour}
                                                            onSetStatus={changeStatus}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}

                                    {/* Calendar entries: always on top of slots */}
                                    {week.entries
                                        .filter((e) => instantToLocalDate(e.start, week.timezone) === d.date)
                                        .map((e) => (
                                            <CalendarEntry
                                                key={e.id}
                                                entry={e}
                                                timezone={week.timezone}
                                                onClick={() => setEntryForm({ mode: "edit", entry: e })}
                                            />
                                        ))}

                                    {ghost?.date === d.date && (
                                        <DropGhost
                                            startMin={ghost.startMin}
                                            durationMin={ghost.durationMin}
                                            colour={ghostClashes(ghost) ? "#DC2626" : ghost.colour}
                                        />
                                    )}

                                    <NowIndicator date={d.date} timezone={week.timezone} />
                                </DayColumn>
                            ))}
                        </div>
                    </DndContext>
                </div>
            </div>

            {awaiting && (
                <OutOfHoursConfirmDialog
                    isWeekend={isWeekendInstant(awaiting.to.start, week.timezone)}
                    onConfirm={() => {
                        applyChange(awaiting, true);
                        setAwaiting(null);
                    }}
                    onCancel={() => setAwaiting(null)}
                />
            )}

            {activeForm && (
                <CalendarEntryForm
                    key={activeForm.mode === "edit" ? activeForm.entry.id : "new"}
                    entry={activeForm.mode === "edit" ? activeForm.entry : undefined}
                    timezone={week.timezone}
                    version={week.version}
                    defaultDate={week.weekStart}
                    onSave={handleSaveEntry}
                    onDelete={handleDeleteEntry}
                    onClose={closeEntryForm}
                />
            )}
        </div>
    );
}