import type { Interval, ProjectBlock as ProjectBlockType, Task } from "../../types/scheduler.types";
import type { ProjectSummary } from "../../types/scheduler.fixtures";
import {
    blockTop,
    blockHeight,
    instantToLocalTime,
    ROW_HEIGHT_PX,
    timeToMinutes,
    DAY_START_HOUR,
    DAY_END_HOUR,
} from "../../utils/scheduler.utils";
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import ResizeHandle from "./resize-handle";
import { getProjectColour } from "./project-colour";
import { type BacklogProjectOption } from "../backlog-panel";

export interface ProjectBlockProps {
    readonly block: ProjectBlockType;
    readonly tasks: Task[];
    readonly project: BacklogProjectOption;
    readonly timezone: string;
    readonly selected?: boolean;
    readonly onResize?: (blockId: string, to: Interval) => void;
    readonly onClick?: () => void;
    readonly onTogglePin?: (pinned: boolean) => void;
    readonly earliestStartMin?: number; // can't extend the top edge earlier than this
}

const MIN_BLOCK_MINUTES = 60;

export default function ProjectBlock({
    block,
    tasks,
    project,
    timezone,
    selected = false,
    onClick,
    onResize,
    onTogglePin,
    earliestStartMin = DAY_START_HOUR * 60,
}: ProjectBlockProps) {
    const { color, lightColor } = getProjectColour(block.projectId);
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
        id: `block:${block.id}`,
    });

    const start = instantToLocalTime(block.start, timezone);
    const end = instantToLocalTime(block.end, timezone);
    const top = blockTop(start);
    const height = blockHeight(start, end);
    const hours = (Date.parse(block.end) - Date.parse(block.start)) / 3_600_000;
    const durationMin = hours * 60;
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);

    const [preview, setPreview] = useState({ top: 0, bottom: 0 });

    function deltaMinutes(fromY: number, toY: number) {
        return Math.round((((toY - fromY) / ROW_HEIGHT_PX) * 60) / 15) * 15;
    }

    function clamp(edge: "top" | "bottom", mins: number) {
        return edge === "top"
            ? Math.max(Math.min(0, earliestStartMin - startMin), Math.min(mins, durationMin - MIN_BLOCK_MINUTES))
            : Math.min(DAY_END_HOUR * 60 - endMin, Math.max(mins, -(durationMin - MIN_BLOCK_MINUTES)));
    }

    function startResize(e: ReactPointerEvent, edge: "top" | "bottom") {
        e.stopPropagation();
        const startY = e.clientY;

        const move = (ev: PointerEvent) => {
            const mins = clamp(edge, deltaMinutes(startY, ev.clientY));
            setPreview(edge === "top" ? { top: mins, bottom: 0 } : { top: 0, bottom: mins });
        };

        const up = (ev: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            const mins = clamp(edge, deltaMinutes(startY, ev.clientY));
            setPreview({ top: 0, bottom: 0 });
            if (mins === 0) return;

            const shift = (instant: string, m: number) =>
                new Date(Date.parse(instant) + m * 60_000).toISOString();

            onResize?.(block.id, {
                start: edge === "top" ? shift(block.start, mins) : block.start,
                end: edge === "bottom" ? shift(block.end, mins) : block.end,
            });
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up, { once: true });
    }

    const displayTop = top + (preview.top / 60) * ROW_HEIGHT_PX;
    const displayHeight = height + ((preview.bottom - preview.top) / 60) * ROW_HEIGHT_PX;

    const hasCarryover = tasks.some(
        (t) => t.carriedOver && t.status !== "Done" && t.slots.some((s) => s.blockId === block.id),
    );
    const isPinned = block.mobility === "pinned";
    const isResized = !!block.userSized;

    const textColour = selected ? "#fff" : color;
    const mutedColour = selected ? "rgba(255,255,255,0.75)" : "#6B7280";

    return (
        <div
            ref={setNodeRef}
            className="absolute left-0.5 right-0.5 rounded-md overflow-hidden select-none"
            style={{
                top: displayTop,
                height: Math.max(displayHeight, 18),
                backgroundColor: selected ? color : lightColor,
                borderLeft: `3px solid ${color}`,
                boxShadow: selected ? `0 2px 12px ${color}50` : "none",
                zIndex: selected ? 5 : 2,
                transition: "opacity 0.15s, box-shadow 0.15s",
                opacity: isDragging ? 0.35 : 1,
            }}
        >
            {/* Covers the whole block: click/Enter selects, Space starts a keyboard drag */}
            <button
                ref={setActivatorNodeRef}
                {...listeners}
                {...attributes}
                type="button"
                aria-pressed={selected}
                aria-label={`${project.label}, ${start} to ${end}`}
                onClick={onClick}
                className="absolute inset-0 w-full h-full focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#002D62]"
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
            />

            {/* Caption row at the bottom, where slots rarely reach */}
            <div className="relative h-full flex flex-col justify-end pointer-events-none">
                <div className="flex items-center gap-1 px-2 py-1 min-w-0">
                    <span className="text-[10px] font-semibold truncate" style={{ color: textColour }}>
                        {hours.toFixed(1)}h · {project.label}
                    </span>
                    {project.clientName && (
                        <span className="text-[10px] truncate" style={{ color: mutedColour }}>
                            · {project.clientName}
                        </span>
                    )}

                    <span className="ml-auto flex items-center gap-1 shrink-0">
                        {hasCarryover && (
                            <span
                                className="text-[8px] font-bold px-1 rounded"
                                style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                                title="Carried over work"
                            >
                                {"\u21A9"}
                            </span>
                        )}
                        {isResized && (
                            <span className="text-[9px]" style={{ color: mutedColour }} title="Resized by you">
                                {"\u2195"}
                            </span>
                        )}
                        <button
                            type="button"
                            className="pointer-events-auto text-[9px] leading-none"
                            style={{ opacity: isPinned ? 1 : 0.35 }}
                            aria-label={isPinned ? "Unpin block" : "Pin block"}
                            aria-pressed={isPinned}
                            title={isPinned ? "Unpin" : "Pin"}
                            onClick={() => onTogglePin?.(!isPinned)}
                        >
                            {"\u{1F4CC}"}
                        </button>
                    </span>
                </div>
            </div>

            <ResizeHandle edge="top" onPointerDown={(e) => startResize(e, "top")} />
            <ResizeHandle edge="bottom" onPointerDown={(e) => startResize(e, "bottom")} />
        </div>
    );
}