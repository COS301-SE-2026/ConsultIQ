import { useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import type { ProjectBlock, Task, SetTaskStatusDto, ToggleSubtaskDto } from "../types/scheduler.types";
import  { getNextStatus , isOverdue} from "./primitives";
import TaskCard from "./task-card";

interface BlockDetailPanelProps {
    block?: ProjectBlock;
    projectLabel: string;
    clientName: string;
    tasks: Task[];
    now: number;
    expectedVersion: number;
    onExpand: () => void;
    onClose: () => void;
    onNextBlock: () => void;
    onAddTask: () => void
    onAutoRollover: () => void;
    onEditTask : (task: Task) => void;
    onSetStatus: (taskId: string, dto: SetTaskStatusDto) => void | Promise<void>;
    onToggleSubtask: (taskId: string, subtaskId: string, dto: ToggleSubtaskDto) => void | Promise<void>;
    onSendToBacklog: (taskId: string) => void | Promise<void>;
    onDeleteTask: (taskId: string) => void | Promise<void>;
    onSplitTask: (task: Task) => void;
    onDragStart?: (task: Task, event: DragEvent<HTMLButtonElement>) => void;
}

type Tab = "all" | "open" | "done";

function formatTimeRange(start: string, end: string):string {
    const fmt = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  return `${fmt(start)} \u2013 ${fmt(end)}`
}

function formatHours(start: string, end: string): string {
    const hours = (Date.parse(end) - Date.parse(start)) / 3_600_000;
    return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(2).replace(/0$/, "")}h`;
}

export default function BlockDetailPanel({ block, projectLabel, clientName, tasks, now, expectedVersion, onExpand, onClose, onNextBlock, onAddTask, onAutoRollover, onEditTask, onSetStatus, onToggleSubtask, onSendToBacklog, onDeleteTask, onSplitTask, onDragStart }: BlockDetailPanelProps) {
    const [tab, setTab] = useState<Tab>("all");

    if(!block){
        return (
            <button type="button" aria-label="Expand block detail panel"
                onClick={onExpand}
                className="flex h-full w-8 items-center justify-center border-l border-slate-200 bg-slate-50 hover:bg-slate-100"
            >
                <ChevronLeft size={16} className="text-slate-400" />
            </button>
        )
    }

    const doneCount= tasks.filter((t) => t.status === "Done").length;
    const total= tasks.length;
    const percent= total > 0 ? Math.round((doneCount / total) * 100) : 0;
    const overdueCount= tasks.filter((t) => isOverdue(t, now)).length;
    const openTasks= tasks.filter((t)  => t.status !== "Done");
    const doneTasks= tasks.filter((t)  => t.status === "Done");
    const visibleTasks= tab === "open" ? openTasks : tab === "done" ? doneTasks : tasks;

    return (
        <aside className="flex h-full w-[340px] flex-col border-l border-slate-200 bg-white">
            <div className="bg-slate-900 px-4 py-4 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-300">{clientName}</p>
                        <h2 className="text-lg font-semibold">{projectLabel}</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <button type="button" aria-label="Add task to this block"
                            onClick={onAddTask}
                            className="rounded p-1 hover:bg-white/10"    
                        >
                            <Plus size={18}/>
                        </button> 

                        <button type="button" aria-label="Next block"
                            onClick={onNextBlock}
                            className="rounded p-1 hover:bg-white/10"
                        >
                            <ChevronRight size={18} />
                        </button>

                        <button type="button" aria-label="Close panel"
                            onClick={onClose}
                            className="rounded p-1 hover:bg-white/10"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-slate-200">
                    <span>{formatTimeRange(block.start, block.end)}</span>
                    <span>{formatHours(block.start, block.end)}</span>
                </div>

                <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                        <span> {doneCount} / {total} complete </span>
                        <span>{percent}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                    {overdueCount > 0 ? (
                        <span className=" text-xs font-medium text-red-300"> &#9888; {overdueCount} task{overdueCount === 1 ? "" : "s"} overdue </span>
                    ):(
                        <span className = "text-xs text-slate-400">No overdue tasks</span>
                    )}
                    <button type="button"
                        onClick={onAutoRollover}
                        className="rounded bg-amber-400 px-2 py-1 text-xs font-semibold text-slate-900 hover:bg-amber-300"
                    >
                        Auto-rollover
                    </button>
                </div>
            </div>

            <div className="flex border-b border-slate-200">
                {([
                    ["all", "All", tasks.length],
                    ["open", "Open", openTasks.length],
                    ["done", "Done", doneTasks.length]
                ] as const).map(([key, Label, count]) => (
                    <button key={key} type="button" onClick={() => setTab(key)} >
                        {Label} ({count})
                    </button>
                ))}
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {visibleTasks.length ===0 && (
                    <p className="pt-6 text-center text-sm text-slate-400"> Nothing here.</p>
                )}
                {visibleTasks.map((task) => {
                    const completed = task.subtasks.filter((s) => s.done).length;
                    return (
                        <TaskCard 
                            key={task.id}
                            task={task}
                            now={now}
                            expectedVersion={expectedVersion}
                            subtaskProgress={{ completed, total: task.subtasks.length }}
                            nextStatus={getNextStatus(task.status) ?? undefined}
                            onEdit={onEditTask}
                            onSetStatus={onSetStatus}
                            onToggleSubtask={onToggleSubtask}
                            onSendToBacklog={onSendToBacklog}
                            onDelete={onDeleteTask}
                            onSplit={onSplitTask}
                            onDragStart={onDragStart}
                        />
                    )
                })

                }
            </div>

        </aside>
    )
}