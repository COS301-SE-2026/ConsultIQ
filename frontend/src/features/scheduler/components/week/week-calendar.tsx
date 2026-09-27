import TimeAxis from "./time-axis";
import Dayheader from "./day-header";
import { holidayWeek, FIXTURE_PROJECTS } from "../../types/scheduler.fixtures";
import type {
    WeekContainer,
    Interval,
    TaskStatus,
    CalendarEntry as CalendarEntryData,
    CalendarEntryDto
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
    kind: "move" | "resize";
    blockId: string;
    to: Interval;
}


export interface WeekCalendarProps {
   readonly weekData?: WeekContainer;
}

function scrollToCoreHours(el: HTMLDivElement | null) {
    if (el) el.scrollTop = blockTop("08:00");
}

export default function WeekCalendar({ weekData = holidayWeek }: WeekCalendarProps) {
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [week, setWeek] = useState(weekData);
    type EntryFormState = { mode: "create" } | { mode: "edit"; entry: CalendarEntryData } | null;
    const [entryForm, setEntryForm] = useState<EntryFormState>(null);
    const [ghost, setGhost] = useState<GhostState | null>(null);
    const [awaiting, setAwaiting] = useState<AwaitingConfirmation | null>(null);
    const [showWeekend, setShowWeekend] = useState(week.metadata.hasWeekend);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, distance: 5 } }),
        useSensor(KeyboardSensor),
    )

    function handleResize(blockId: string, to: Interval) {
        setWeek((w) => ({
            ...w,
            blocks: w.blocks.map((b) => (b.id === blockId ? { ...b, ...to, userSized: true } : b)),
        }));
    }

    function handleMoveBlock(blockId: string, to: Interval) {
        setWeek((w) => ({
            ...w,
            blocks: w.blocks.map((b) => (b.id === blockId ? { ...b, ...to } : b)),
        }));
    }

    function handleSetStatus(taskId: string, status: TaskStatus) {
        setWeek((w) => ({
            ...w,
            tasks: w.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),

        }));
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
        setEntryForm(null);
    }

    function handleDeleteEntry(entryId: string) {
        setWeek((w) => ({ ...w, entries: w.entries.filter((e) => e.id !== entryId) }));
        setEntryForm(null);
    }


    function applyChange(c: AwaitingConfirmation) {
        if (c.kind === "move") handleMoveBlock(c.blockId, c.to);
        else handleResize(c.blockId, c.to);
    }

    function requestChange(c: AwaitingConfirmation) {
        const needsConfirm =
            isIntervalOutOfHours(c.to, week.timezone) || isWeekendInstant(c.to.start, week.timezone);
        if (needsConfirm) setAwaiting(c);
        else applyChange(c);
    }

    function snappedStart(blockId: string, deltaY: number) {
        const b = week.blocks.find((x) => x.id === blockId)!;
        const originalMin = timeToMinutes(instantToLocalTime(b.start, week.timezone));
        const durationMin = (Date.parse(b.end) - Date.parse(b.start)) / 60_000;
        const moved = originalMin + Math.round(((deltaY / ROW_HEIGHT_PX) * 60) / 15) * 15;
        const startMin = Math.max(DAY_START_HOUR * 60, Math.min(DAY_END_HOUR * 60 - durationMin, moved));
        return { startMin, durationMin, colour: getProjectColour(b?.projectId).color }
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
        const { startMin, durationMin } = snappedStart(String(active.id), delta.y);
        const start = fromZonedTime(`${over.id}T${minutesToTime(startMin)}:00`, week.timezone);
        const end = new Date(start.getTime() + durationMin * 60_000);
        requestChange({
            kind: "move",
            blockId: String(active.id),
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
        <div className="flex flex-col gap-2">
            <button
                className="self-start px-3 py-1 text-sm rounded border border-slate-300"
                onClick={() => setShowWeekend((s) => !s)}
            >
                {showWeekend ? "Hide weekend" : "Show weekend"}
            </button>
          

                <div ref={scrollToCoreHours} className="isolate overflow-auto border border-slate-200 max-h-[70vh]">
                    <div style={{ minWidth: 64 + days.length * 1 }}>

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
                                            .map((b) => (
                                                <ProjectBlock
                                                    key={b.id}
                                                    block={b}
                                                    tasks={week.tasks}
                                                    project={FIXTURE_PROJECTS.find((p) => p.id === b.projectId)!}
                                                    timezone={week.timezone}
                                                    selected={selectedBlockId === b.id}
                                                    onClick={() => setSelectedBlockId(b.id)}
                                                    onResize={(blockId, to) => requestChange({ kind: "resize", blockId, to })}
                                                    onSetStatus={handleSetStatus}
                                                />
                                            ))
                                        }

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
                    onConfirm={() => { applyChange(awaiting); setAwaiting(null); }}
                    onCancel={() => setAwaiting(null)}
                />
            )}

            {entryForm && (
                <CalendarEntryForm
                    key={entryForm.mode === "edit" ? entryForm.entry.id : "new"}
                    entry={entryForm.mode === "edit" ? entryForm.entry : undefined}
                    timezone={week.timezone}
                    version={week.version}
                    defaultDate={week.weekStart}
                    onSave={handleSaveEntry}
                    onDelete={handleDeleteEntry}
                    onClose={() => setEntryForm(null)}
                />
            )}

        </div>

    );



}