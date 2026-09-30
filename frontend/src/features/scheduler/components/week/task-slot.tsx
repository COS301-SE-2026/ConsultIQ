import type { MouseEvent as ReactMouseEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Slot, Task, TaskStatus } from "../../types/scheduler.types";
import { instantToLocalTime } from "../../utils/scheduler.utils";

export interface TaskSlotProps {
    readonly slot: Slot;
    readonly task: Task;
    readonly timezone: string;
    readonly color: string;
    readonly selected?: boolean;
    readonly onSetStatus?: (taskId: string, status: TaskStatus) => void;
}

function weekday(instant: string, timeZone: string) {
    return new Date(instant).toLocaleDateString("en-GB", { weekday: "short", timeZone });
}

export default function TaskSlot({ slot, task, timezone, color, selected = false, onSetStatus }: TaskSlotProps) {
    // Audit slots from a rollover cover specific (completed) subtasks and must not change.
    // A slot locked by a manual move doesn't, and stays usable.
    const isAuditSlot = slot.locked && (slot.subtaskIds?.length ?? 0) > 0;
    const movable = !isAuditSlot && task.status === "Ready";

    const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
        id: `slot:${slot.id}`,
        disabled: !movable,
    });

    const days = [
        ...new Set(
            [...task.slots]
                .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
                .map((s) => weekday(s.start, timezone)),
        ),
    ];
    const thisDay = weekday(slot.start, timezone);

    const textColour = selected ? "rgba(255,255,255,0.9)" : color;
    const mutedColour = selected ? "rgba(255,255,255,0.6)" : "#6B7280";

    function setStatus(e: ReactMouseEvent, status: TaskStatus) {
        e.stopPropagation();
        onSetStatus?.(task.id, status);
    }

    return (
        <div
            ref={setNodeRef}
            className="h-full px-1.5 py-1 rounded text-[9px] flex flex-col gap-0.5 overflow-hidden"
            style={{
                backgroundColor: selected ? "rgba(255,255,255,0.12)" : color + "12",
                opacity: isDragging ? 0.4 : 1,
            }}
        >
            <div className="flex items-center gap-1">
                {movable && (
                    <button
                        ref={setActivatorNodeRef}
                        {...listeners}
                        {...attributes}
                        type="button"
                        aria-label={`Move ${task.title}`}
                        className="pointer-events-auto touch-none shrink-0 leading-none"
                        style={{ color: mutedColour, cursor: isDragging ? "grabbing" : "grab" }}
                    >
                        {"\u283F"}
                    </button>
                )}

                <span
                    className="text-xs truncate font-medium flex-1"
                    style={{ color: textColour, textDecoration: task.status === "Done" ? "line-through" : "none" }}
                >
                    {task.title}
                </span>

                {isAuditSlot && <span title="Locked">{"\u{1F512}"}</span>}

                {!isAuditSlot && task.status === "Ready" && (
                    <button
                        type="button"
                        className="pointer-events-auto"
                        aria-label={`Start ${task.title}`}
                        title="Start"
                        style={{ color: textColour }}
                        onClick={(e) => setStatus(e, "InProgress")}
                    >
                        {"\u25B6"}
                    </button>
                )}

                {!isAuditSlot && task.status === "InProgress" && (
                    <button
                        type="button"
                        className="pointer-events-auto"
                        aria-label={`Complete ${task.title}`}
                        title="Complete"
                        style={{ color: textColour }}
                        onClick={(e) => setStatus(e, "Done")}
                    >
                        {"\u2713"}
                    </button>
                )}
            </div>

            <div className="flex items-center justify-between gap-1" style={{ color: mutedColour }}>
                <span className="text-xs">
                    {instantToLocalTime(slot.start, timezone)} – {instantToLocalTime(slot.end, timezone)}
                </span>
                {days.length > 1 && (
                    <span className="flex gap-1">
                        {days.map((d) => (
                            <span key={d} style={{ fontWeight: d === thisDay ? 700 : 400, opacity: d === thisDay ? 1 : 0.5 }}>
                                {d}
                            </span>
                        ))}
                    </span>
                )}
            </div>
        </div>
    );
}