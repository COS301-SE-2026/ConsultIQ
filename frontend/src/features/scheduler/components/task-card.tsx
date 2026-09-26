/* eslint-disable react-hooks/purity */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, type DragEvent } from "react";
import { ArrowRight, GripVertical, X } from "lucide-react";
import type { SetTaskStatusDto, Task, TaskStatus, ToggleSubtaskDto } from "../types/scheduler.types";

interface TaskCardProps {
    task: Task;
    expectedVersion: number;
    subtaskProgress : { completed: number, total : number };
    nextStatus? : { status : TaskStatus, label : string }
    timeZone?: string;
    onEdit: (task: Task) => string;
    onSetStatus: (taskId : string, dto : ToggleSubtaskDto) => void | Promise<void>;
    onToggleSubtask: (taskId: string, subtaskId : string, dto: ToggleSubtaskDto) => void | Promise<void>;
    onSendToBacklog: (taskId: string) => void | Promise<void>;
    onDelete: (taskId: string) => void | Promise<void>;
    onSplit: (task: Task) => void;
    onDragStart?: (task: Task, event: DragEvent<HTMLButtonElement>) => void;  
}

const STATUS_LABELS: Record<TaskStatus, string> = {
    Ready: "Ready",
    InProgress: "In Progress",
    Done: "Done"
};

export default function TaskCard({ task, expectedVersion, subtaskProgress, nextStatus, timeZone,
  onEdit, onSetStatus, onToggleSubtask, onSendToBacklog, onDelete, onSplit, onDragStart, } : TaskCardProps){

  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  //const startTime = getStartTime(task, timeZone);

    const overdue = task.status !== "Done" && Boolean(task.deadline) && Date.parse(task.deadline ?? "") < Date.now();

  function stopAndRun(action: () => void) {
    return (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      action();
    };
  }

  return (
    <article className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
    onClick={() => onEdit(task)}
    >
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
                    <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-white">
                        P{task.urgency}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {STATUS_LABELS[task.status]}
                    </span>

                    {/* {startTime && (
                        <span className="text-xs text-slate-500">from {startTime} </span>
                    )} */}
                </div>

                <button type="button" className="mt-2 block text-left font-semibold text-slate-900 hover:text-indigo-700"
                    onClick={stopAndRun(() => onEdit(task))}
                >
                    {task.title}
                </button>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2"> Level {task.complexity} </span>
                    <span></span>
                    <span>{subtaskProgress.completed}/{subtaskProgress.total}</span>
                </div>

                {overdue && (
                    <p className="mt-2 text-sm font-medium text-red-600"> Overdue </p>
                )}

                {task.subtasks.length > 0 && (
                    <section className="mt-3 border-t border-slate-100 pt-3"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button type="button" aria-expanded={subtasksExpanded}
                            className="text-sm text-slate-600 hover:text-slate-900"
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

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3"
                onClick={(event) => event.stopPropagation()}
            >
                {nextStatus && (
                    <button type="button" 
                        className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                        //onClick={() => void onSetStatus(task.id, { status : nextStatus.status, expectedVersion })}
                        >
                        <ArrowRight size={14} />
                        {nextStatus.label}
                    </button>
                )}

                <button type="button"
                    className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                    BL
                </button>

                <button type="button"
                    className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                    Split
                </button>
            </div>
    </article>
  );
} 