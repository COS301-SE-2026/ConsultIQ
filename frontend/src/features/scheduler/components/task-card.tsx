import { useState, type DragEvent } from "react";
import { ArrowRight, GripVertical, X } from "lucide-react";
import type { SetTaskStatusDto, Task, TaskStatus, ToggleSubtaskDto } from "../types/scheduler.types";
import { ComplexityBars } from "./primitives";
import {STATUS_LABELS, formatDuration, getStartTime } from "./scheduler-utils";

interface TaskCardProps {
    readonly task: Task;
    readonly now : number;
    readonly expectedVersion: number;
    readonly subtaskProgress : { completed: number, total : number };
    readonly nextStatus? : { status : TaskStatus, label : string }
    readonly timeZone?: string;
    readonly onEdit: (task: Task) => void;
    readonly onSetStatus: (taskId : string, dto : SetTaskStatusDto) => void | Promise<void>;
    readonly onToggleSubtask: (taskId: string, subtaskId : string, dto: ToggleSubtaskDto) => void | Promise<void>;
    readonly onSendToBacklog: (taskId: string) => void | Promise<void>;
    readonly onDelete: (taskId: string) => void | Promise<void>;
    readonly onSplit: (task: Task) => void;
    readonly onDragStart?: (task: Task, event: DragEvent<HTMLButtonElement>) => void;  
}

function stopAndRun(action: () => void) {
    return (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      action();
    };
}

export default function TaskCard({ task, now, expectedVersion, subtaskProgress, nextStatus, timeZone,
  onEdit, onSetStatus, onToggleSubtask, onSendToBacklog, onDelete, onSplit, onDragStart, } : TaskCardProps){

  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const startTime = getStartTime(task, timeZone);

    const overdue = task.status !== "Done" && Boolean(task.deadline) && Date.parse(task.deadline ?? "") < now;

  return (
    <article className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
        <div className="flex items-start gap-3">
            <button type="button" aria-label="Drag task" title="Drag task"
                draggable={Boolean(onDragStart)}
                className="mt-1 shrink-0 cursor-grab text-slate-400 active:cursor-grabbing"
                onClick={(event) => event.stopPropagation()}
                onDragStart={(event) => onDragStart?.(task, event)}
            >
                <GripVertical size={18} />
            </button>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary px-2 py-1 text-xs font-bold text-white">
                        P{task.urgency}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {STATUS_LABELS[task.status]}
                    </span>

                    {startTime && (
                        <span className="text-xs text-slate-500">from {startTime} </span>
                    )}
                </div>

                <button type="button" className="mt-2 block text-left font-semibold text-primary text-sm hover:text-indigo-700"
                    onClick={stopAndRun(() => onEdit(task))}
                >
                    {task.title}
                </button>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2">
                         Level {task.complexity}
                         <ComplexityBars level={task.complexity}/>
                    </span>
                    <span>{formatDuration(task.tMin)}–{formatDuration(task.tMax)}</span>
                    <span>{subtaskProgress.completed}/{subtaskProgress.total}</span>
                </div>

                {overdue && (
                    <p className="mt-2 text-sm font-medium text-red-600"> Overdue </p>
                )}

                {task.subtasks.length > 0 && (
                    <section className="mt-3 border-t border-slate-100 pt-3"
                    >
                        <button type="button" aria-expanded={subtasksExpanded}
                            className="text-sm text-slate-600 hover:text-slate-900"
                            onClick={(event) =>{
                                event.stopPropagation();
                                setSubtasksExpanded((expanded) => !expanded)
                            }}
                        >
                            {subtasksExpanded ? "Hide subtasks" : "Show subtasks"}
                        </button>

                        {subtasksExpanded && (
                            <div className="mt-2 space-y-2">
                                {task.subtasks.map((subtask) => (
                                    <label key={subtask.id}
                                        className="flex items-center gap-2 text-sm text-slate-700"
                                    >
                                        <input type="checkbox" 
                                            checked={subtask.done}
                                            onClick={(event) => event.stopPropagation()}
                                            onChange={() => void onToggleSubtask(task.id, subtask.id, { expectedVersion })}
                                        />
                                        <span className={subtask.done ? "text-slate-400 line-through" : ""} > {subtask.title} </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </section>
                )}
                </div>

                <button type="button" aria-label="Delete task" title="Delete task"
                    className="shrink-0 text-slate-400 hover:text-red-600"
                    onClick={stopAndRun(() => void onDelete(task.id))}
                >
                    <X size={18} />
                </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {nextStatus && (
                    <button type="button" 
                        className="inline-flex items-center gap-1 rounded-2xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/80"
                        onClick={(event) =>{
                            event.stopPropagation();
                            void onSetStatus(task.id, { status : nextStatus.status, expectedVersion })
                        }}
                        >
                        <ArrowRight size={14} />
                        {nextStatus.label}
                    </button>
                )}

                <button type="button"
                    className="rounded-2xl border border-primary px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => void onSendToBacklog(task.id)}
                >
                    ↓ BL
                </button>

                <button type="button"
                    className="rounded-2xl border border-primary px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => onSplit(task)}                
                >
                    Split
                </button>
            </div>
    </article>
  );
} 