import type { DragEvent } from "react";
import { AlertTriangle, Calendar, GripVertical, Zap, X } from "lucide-react";
import type { DeferToNextWeekDto, ReasonCode, Task, UnplacedTaskSummary } from "../types/scheduler.types";
import { ReasonCode as Reason } from "../types/scheduler.types";
import { ComplexityBars, formatDuration, formatEstimateRange  } from "./primitives";

interface BacklogTaskCardProps {
    task: Task;
    projectLabel: string;
    projectColor: string;
    unplacedSummary?: UnplacedTaskSummary;
    now: number;
    expectedVersion: number;
    onSchedule: (taskId: string) => void | Promise<void>;
    onResolveDeadline: (task: Task) => void;
    onDeferToNextWeek: (taskId: string, dto: DeferToNextWeekDto) => void | Promise<void>;
    onDismiss: (taskId: string) => void | Promise<void>;
    onDragStart?: (task: Task, event : DragEvent<HTMLButtonElement>) => void;
}

const URGENCY_DOT: Record<Task["urgency"], string> = {
    1: "bg-slate-400",
    2: "bg-amber-500",
    3: "bg-orange-500",
    4: "bg-red-600"
}

const URGENCY_LABEL: Record<Task["urgency"], string> = {
    1: "Low",
    2: "Medium",
    3: "High",
    4: "Critical"
}

const URGENT_DEADLINE_DAYS = 7;

function daysUntil(deadline: string, now: number) : number {
    const ms = new Date(deadline).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0);
    return Math.round(ms / 86_400_000);
}

function DeadlineLabel({ deadline, now } : { deadline?: string; now : number }) {
    if(!deadline) return null;
    const days = daysUntil(deadline, now);
    const urgent = days <= URGENT_DEADLINE_DAYS;
    const date = new Date(deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" });

    if(urgent){
        return(
            <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600" >
                <Zap size={14} />
                {date} ({days}d)
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 text-sm text-slate-500" >
            <Calendar size={14} />
            {date} 
        </span>
    )
}

export default function BacklogTaskCard({task, projectLabel, projectColor, unplacedSummary, now,
  expectedVersion, onSchedule, onResolveDeadline, onDeferToNextWeek, onDismiss, onDragStart}: BacklogTaskCardProps) {

    return (
        <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm" style={{borderLeftWidth: 4, borderLeftColor: projectColor}}>
            <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: projectColor }}> {projectLabel} </p>
                    <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-bold text-indigo-700">
                        P{5 - task.urgency}
                    </span>
            </div>

            <p className="mt-1 font-semibold text-slate-900">{task.title}</p>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className = "inline-flex items-center gap-1.5">
                    <span className = {`h-2 w-2 rounded-full ${URGENCY_DOT[task.urgency]}`} />
                        {URGENCY_LABEL[task.urgency]}
                        <ComplexityBars level={task.complexity} />
                </span>
                <span className="text-slate-500">{formatEstimateRange(task.tMin, task.tMax)}</span>
            </div>

            <div className="mt-1.5">
                <DeadlineLabel deadline={task.deadline} now={now} />
            </div>

            <div className="mt-3 flex items-center gap-2">
                <button type="button" aria-label="Drag to calendar" title="Drag to calendar"
                    draggable={Boolean(onDragStart)}
                    className="shrink-0 cursor-grab text-slate-400 active:cursor-grabbing"
                    onClick={(event) => event.stopPropagation()}
                    onDragStart={(event) => onDragStart?.(task, event)}
                >
                    <GripVertical size={18} />
                </button>

                <button type="button"
                    className="flex-1 rounded px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: projectColor }}
                >
                    &rarr; Schedule
                </button>

                <button type="button" aria-label="Dismiss" title="Dismiss"
                    className="shrink-0 text-slate-400 hover:text-red-600"
                >
                    <X size={18} />
                </button>
            </div>
        </article>
    )
}

