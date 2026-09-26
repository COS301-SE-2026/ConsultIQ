import type { Interval, ProjectBlock as ProjectBlockType, Task, TaskStatus } from "../../types/scheduler.types";
import type { ProjectSummary } from "../../types/scheduler.fixtures";
import { blockTop, blockHeight, instantToLocalTime, priorityScore, ROW_HEIGHT_PX } from "../../utils/scheduler.utils";
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import ResizeHandle from "./resize-handle";
import BatchSlot from "./batch-slot";
import TaskSlot from "./task-slot";

const PROJECT_COLOURS: Record<string, { color: string; lightColor: string }> = {
    "proj-digital": { color: "#2563EB", lightColor: "#EFF6FF" },
    "proj-cloud": { color: "#0D9488", lightColor: "#F0FDFA" },
    "proj-data": { color: "#7C3AED", lightColor: "#F5F3FF" },
};

const FALLBACK = { color: "#64748B", lightColor: "#F8FAFC" };

export function getProjectColour(projectId: string) {
    return PROJECT_COLOURS[projectId] ?? FALLBACK;
}

export interface ProjectBlockProps {
    block: ProjectBlockType;
    tasks: Task[];
    project: ProjectSummary;
    timezone: string;
    selected?: boolean;
    onResize?: (blockId: string, to: Interval) => void;
    onClick?: () => void;
    onSetStatus?: (taskId: string, status: TaskStatus) => void;
}

export default function ProjectBlock({ block, tasks, project, timezone, selected = false, onClick, onResize,onSetStatus }: ProjectBlockProps) {
    const { color, lightColor } = getProjectColour(block.projectId);

    const start = instantToLocalTime(block.start, timezone);
    const end = instantToLocalTime(block.end, timezone);
    const top = blockTop(start);
    const height = blockHeight(start, end);
    const hours = (Date.parse(block.end) - Date.parse(block.start)) / 3_600_000;

    const [preview, setPreview] = useState({ top: 0, bottom: 0 });
    const durationMin = hours * 60;
    const MIN_MIN = 60;

    function deltaMinutes(fromY: number, toY: number) {
        return Math.round((((toY - fromY) / ROW_HEIGHT_PX) * 60) / 15) * 15;
    }

    function clamp(edge: "top" | "bottom", mins: number) {
        return edge === "top"
            ? Math.min(mins, durationMin - MIN_MIN)
            : Math.max(mins, -(durationMin - MIN_MIN));
    }

    function startResize(e: React.PointerEvent, edge: "top" | "bottom") {
        e.stopPropagation();
        const startY = e.clientY;

        const move = (ev: PointerEvent) => {
            const mins = clamp(edge, deltaMinutes(startY, ev.clientY));
            setPreview(edge === "top" ? { top: mins, bottom: 0 } : { top: 0, bottom: 0 });
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


    const blockTasks = tasks.filter((t) => t.status !== "Done"
        && t.slots.some((s) => s.blockId === block.id))
        .sort((a, b) => priorityScore(b) - priorityScore(a));

    const blockSlots = [
        ...new Map(
            tasks.flatMap((t) => t.slots)
                .filter((s) => s.blockId === block.id)
                .map((s) => [s.id, s]),
        ).values(),

    ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));


    const hasCarryover = blockTasks.some((t) => t.carriedOver);
    const isPinned = block.mobility === "pinned";
    const isResized = !!block.userSized;

    const small = displayHeight < 44;
    const medium = displayHeight >= 44 && displayHeight < 90;

    const titleColour = selected ? "#fff" : color;
    const mutedColour = selected ? "rgba(255,255,255,0.6)" : "#6B7280";

    const indicators = (
        <div className="flex items-center gap-0.5 shrink-0">
            {hasCarryover && (
                <span className="text-[8px] font-bold px-1 rounded" style={{ backgroundColor: "#FEF3C7", color: "#92400e" }} title="Carried over work">{'\u21A9'}</span>
            )}

            {isPinned && <span className="text-[9px]" style={{ color: mutedColour }} title="Pinned" >{'\u{1F4CC}'}</span>}
            {isResized && <span className="text-[9px]" style={{ color: mutedColour }} title="Resized by you">{'\u2195'}</span>}
        </div>
    );


    return (
        <div
            onClick={onClick}
            className="absolute left-0.5 right-0.5 rounded-md overflow-hidden select-none cursor-pointer"
            style={{
                top: displayTop,
                height: Math.max(displayHeight, 18),
                backgroundColor: selected ? color : lightColor,
                borderLeft: `3px solid ${color}`,
                boxShadow: selected ? `0 2px 12px ${color}50` : "0 1px 3px rgba(0,0,0,0.05)",
                zIndex: selected ? 5 : 2,
                transition: "box-shadow 0.15s",
            }}
        >
            {small ? (
                <div className="px-1.5 flex items-center h-full gap-1 overflow-hidden">
                    <span className="text-[10px] font-bold truncate" style={{ color: titleColour }} >{project.name}</span>
                    {indicators}
                </div>
            ) : medium ? (
                <div className="px-2 py-1 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold truncate" style={{ color: titleColour }}>{project.name}</span>
                        {indicators}
                    </div>
                    {blockTasks[0] && (
                        <span className="text-[9px] truncate" style={{ color: mutedColour }}>{'\u25B6'} {blockTasks[0].title}</span>
                    )}
                </div>
            ) : (

                <div className="px-2 py-1.5 flex flex-col gap-1 h-full">
                    <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold leading-tight block truncate" style={{ color: titleColour }}>{project.name}</span>
                            <span className="text-[9px] block truncate" style={{ color: mutedColour }}>{project.clientName}</span>
                        </div>
                        {indicators}
                    </div>


                    {blockSlots.slice(0, 3).map((s) =>
                        s.kind === "batch" ? (
                            <BatchSlot
                                key={s.id}
                                slot={s}
                                tasks={tasks}
                                color={color}
                                selected={selected}
                            />
                        ) : (
                            <TaskSlot
                                key={s.id}
                                slot={s}
                                task={tasks.find((t) => t.id === s.taskIds[0])!}
                                timezone={timezone}
                                color={color}
                                selected={selected}
                                onSetStatus={onSetStatus}
                            />
                        ),
                    )}



                    {displayHeight >= 120 && (
                        <div className="mt-auto">
                            <span className="text-[9px]" style={{ color: mutedColour }}>{hours.toFixed(1)}h &middot; {project.clientName} </span>
                        </div>
                    )}
                </div>

            )}
            <ResizeHandle edge="top" onPointerDown={(e) => startResize(e, "top")} />
            <ResizeHandle edge="bottom" onPointerDown={(e) => startResize(e, "bottom")} />
        </div>
    );
}