import TimeAxis from "./time-axis";
import Dayheader from "./day-header";
import { holidayWeek, FIXTURE_PROJECTS, type ProjectSummary } from "../../types/scheduler.fixtures";
import type {
    WeekContainer,
    Interval,
    TaskStatus,
    CalendarEntry as CalendarEntryData,
    CalendarEntryDto,
    ProjectBlock as ProjectBlockData,
    SetTaskStatusDto,
} from "../../types/scheduler.types";
import CalendarEntryForm from "../calendar-entry-form";
import {
    localDate,
    instantToLocalTime,
    instantToLocalDate,
    timeToMinutes,
    minutesToTime,
    ROW_HEIGHT_PX,
    blockTop,
    isIntervalOutOfHours,
    DAY_START_HOUR,
    DAY_END_HOUR,
    isWeekendInstant

} from "../../utils/scheduler.utils"
import ProjectBlock from "./project-block";
import { getProjectColour } from "./project-colour";
import { useState } from "react";
import CalendarEntry from "./calendar-entry"
import { fromZonedTime } from "date-fns-tz"
import NowIndicator from "./now-indicator";
import DropGhost from "./drag-ghost";
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
import DayColumn from "./day-column";
import OutOfHoursConfirmDialog from "./out-of-hours-dialog";

const DAY_Names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function addDays(date: string, days: number): string {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

interface GhostState {
    date: string;
    startMin: number;
    durationMin: number;
    colour: string;
}

interface AwaitingConfirmation {
    kind: "move" | "resize" | "slot";
    id: string;
    to: Interval;
}


export interface WeekCalendarProps {
    readonly weekData?: WeekContainer;
    readonly projects?: ProjectSummary[];
    readonly createEntryRequested?: boolean;
    readonly onCreateEntryDone?: () => void;
    readonly onMoveBlock?: (blockId: string, to: Interval, confirmedOverride: boolean) => Promise<boolean>;
    readonly onResizeBlock?: (blockId: string, to: Interval, confirmedOverride: boolean) => Promise<boolean>;
    readonly onPinBlock?: (blockId: string, pinned: boolean) => Promise<boolean>;
    readonly onMoveSlot?: (slotId: string, to: Interval, confirmedOverride: boolean) => Promise<boolean>;
    readonly onSetStatus?: (taskId: string, dto: SetTaskStatusDto) => void | Promise<void>;
}

function scrollToCoreHours(el: HTMLDivElement | null) {
    if (el) el.scrollTop = blockTop("08:00");
}

type EntryFormState = { mode: "create" } | { mode: "edit"; entry: CalendarEntryData } | null;

function withBlock(w: WeekContainer, blockId: string, patch: Partial<ProjectBlockData>): WeekContainer {
    return { ...w, blocks: w.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) };
}


function parseDragId(dragId: string) {
    const i = dragId.indexOf(":");
    return { kind: dragId.slice(0, i) as "block" | "slot", id: dragId.slice(i + 1) };
}


function withSlot(w: WeekContainer, slotId: string, to: Interval): WeekContainer {
    return {
        ...w,
        tasks: w.tasks.map((t) => ({
            ...t,
            slots: t.slots.map((s) => (s.id === slotId ? { ...s, ...to } : s)),
        })),
    };
}

export default function WeekCalendar({ weekData = holidayWeek, projects = FIXTURE_PROJECTS, createEntryRequested = false, onCreateEntryDone, onMoveBlock, onMoveSlot, onPinBlock, onResizeBlock, onSetStatus }: WeekCalendarProps) {
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [week, setWeek] = useState(weekData);
    const [entryForm, setEntryForm] = useState<EntryFormState>(null);
    const [ghost, setGhost] = useState<GhostState | null>(null);
    const [awaiting, setAwaiting] = useState<AwaitingConfirmation | null>(null);
    const [showWeekend, setShowWeekend] = useState(week?.metadata?.hasWeekend);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] }, }),
    )

    const activeForm: EntryFormState = entryForm ?? (createEntryRequested ? { mode: "create" } : null);

    function closeEntryForm() {
        setEntryForm(null);
        onCreateEntryDone?.();
    }


    function handleSetStatus(taskId: string, status: TaskStatus) {
        setWeek((w) => ({
            ...w,
            tasks: w.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),

        }));
    }

    function changeStatus(taskId: string, status: TaskStatus) {
        if (onSetStatus) {
            onSetStatus(taskId, { status, expectedVersion: week.version });
        } else {
            handleSetStatus(taskId, status); // fixtures only: no backend
        }
    }

    function handleSaveEntry(dto: CalendarEntryDto) {
        const saved: CalendarEntryData = {
            id: dto.id ?? crypto.randomUUID(),
            type: dto.type,
            start: dto.start,
            end: dto.end,
            tags: dto.tags,
            origin: dto.origin,
        };
        setWeek((w) => ({
            ...w,
            entries: dto.id ? w.entries.map((e) => (e.id === dto.id ? saved : e)) : [...w.entries, saved],
        }));
        closeEntryForm();
    }

    function handleDeleteEntry(entryId: string) {
        setWeek((w) => ({ ...w, entries: w.entries.filter((e) => e.id !== entryId) }));
        closeEntryForm();
    }


    function applyOptimistic(patch: (w: WeekContainer) => WeekContainer, save?: Promise<boolean>) {
        const previous = week;
        setWeek(patch(previous));
        save?.then((ok) => {
            if (!ok) setWeek(previous);
        });
    }

    function applyChange(c: AwaitingConfirmation, confirmedOverride = false) {
    if (c.kind === "slot") {
        applyOptimistic(
            (w) => withSlot(w, c.id, c.to),
            onMoveSlot?.(c.id, c.to, confirmedOverride),
        );
    } else if (c.kind === "move") {
        applyOptimistic(
            (w) => withBlock(w, c.id, c.to),
            onMoveBlock?.(c.id, c.to, confirmedOverride),
        );
    } else {
        applyOptimistic(
            (w) => withBlock(w, c.id, { ...c.to, userSized: true }),
            onResizeBlock?.(c.id, c.to, confirmedOverride),
        );
    }
}

    function handleTogglePin(blockId: string, pinned: boolean) {
        applyOptimistic(
            (w) => withBlock(w, blockId, { mobility: pinned ? "pinned" : "fluid" }),
            onPinBlock?.(blockId, pinned),
        );
    }

    function requestChange(c: AwaitingConfirmation) {
        const needsConfirm =
            isIntervalOutOfHours(c.to, week.timezone) || isWeekendInstant(c.to.start, week.timezone);
        if (needsConfirm) setAwaiting(c);
        else applyChange(c);
    }

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

    function handleDragMove({ active, over, delta }: DragMoveEvent) {
        if (!over) {
            if (ghost) setGhost(null);
            return;
        }

        const next = { date: String(over.id), ...snappedStart(String(active.id), delta.y) };
        if (ghost?.date === next.date && ghost.startMin === next.startMin) return;
        setGhost(next);

    }

    function handleDragEnd({ active, over, delta }: DragEndEvent) {
    setGhost(null);
    if (!over) return;

    const { kind, id } = parseDragId(String(active.id));
    const { startMin, durationMin } = snappedStart(String(active.id), delta.y);
    const start = fromZonedTime(`${over.id}T${minutesToTime(startMin)}:00`, week.timezone);
    const end = new Date(start.getTime() + durationMin * 60_000);

    requestChange({
        kind: kind === "slot" ? "slot" : "move",
        id,
        to: { start: start.toISOString(), end: end.toISOString() },
    });
}

    const today = instantToLocalDate(new Date().toISOString(), week.timezone);

    const days = DAY_Names.map((name, i) => {
        const date = addDays(week.weekStart, i);
        const holiday = week.holidays.find((h) => h.date === date);

        const minutes = week.tasks.flatMap((t) => t.slots)
            .filter((s) => localDate(s.start, week.timezone) === date)
            .reduce((sum, s) => sum + (Date.parse(s.end) - Date.parse(s.start)) / 60000, 0);

        return {
            name,
            date,
            isWeekend: i >= 5,
            isToday: date === today,
            isHoliday: !!holiday,
            holidayName: holiday?.name,
            totalHours: minutes / 60,

        };
    }).filter((d) => showWeekend || !d.isWeekend);

    return (
        <div className="flex flex-col gap-2 w-full min-w-0 flex-1 min-h-0">
            <button
                className="self-start px-3 py-1 text-sm rounded border border-slate-300"
                onClick={() => setShowWeekend((s) => !s)}
            >
                {showWeekend ? "Hide weekend" : "Show weekend"}
            </button>


            <div ref={scrollToCoreHours} className="isolate flex-1 min-h-0 overflow-auto border border-slate-200 max-h-[70vh]">
                <div style={{ minWidth: 64 + days.length * 112 }}>

                    {/*Header row*/}
                    <div className="sticky top-0 z-40 flex bg-white border-b border-slate-200" >
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
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                        onDragCancel={() => setGhost(null)}
                        sensors={sensors}
                    >

                        <div className="flex">
                            <TimeAxis />
                            {days.map((d) => (
                                <DayColumn key={d.date} date={d.date} isHoliday={d.isHoliday} isWeekend={d.isWeekend}>
                                    {week.blocks
                                        .filter((b) => instantToLocalDate(b.start, week.timezone) === d.date)
                                        .map((b) => {
                                            const project = projects.find((item) => item.id === b.projectId) ?? {
                                                id: b.projectId,
                                                name: b.projectId,
                                                clientName: "",
                                            };
                                            return (
                                                <ProjectBlock
                                                    key={b.id}
                                                    block={b}
                                                    tasks={week.tasks}
                                                    project={project}
                                                    timezone={week.timezone}
                                                    selected={selectedBlockId === b.id}
                                                    onClick={() => setSelectedBlockId(b.id)}
                                                    onResize={(blockId, to) => requestChange({ kind: "resize", id: blockId, to })}
                                                    onSetStatus={changeStatus}
                                                    onTogglePin={(pinned) => handleTogglePin(b.id, pinned)}
                                                />
                                            );
                                        })}

                                    {week.entries.filter((e) => instantToLocalDate(e.start, week.timezone) === d.date)
                                        .map((e) => (
                                            <CalendarEntry
                                                key={e.id}
                                                entry={e}
                                                timezone={week.timezone}
                                                onClick={() => setEntryForm({ mode: "edit", entry: e })}
                                            />


                                        ))}
                                    {ghost?.date === d.date && (
                                        <DropGhost startMin={ghost.startMin} durationMin={ghost.durationMin} colour={ghost.colour} />
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
                    onConfirm={() => { applyChange(awaiting, true); setAwaiting(null); }}
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