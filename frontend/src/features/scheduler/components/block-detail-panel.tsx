import { useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import type { ProjectBlock, Task, SetTaskStatusDto, ToggleSubtaskDto } from "../types/scheduler.types";
import  { getNextStatus , isOverdue} from "./primitives";
//import TaskCard from "./task-card";

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


export default function BlockDetailPanel({ block, projectLabel, clientName, tasks, now, expectedVersion, onExpand, onClose, onNextBlock, onAddTask, onAutoRollover, onEditTask, onSetStatus, onToggleSubtask, onSendToBacklog, onDeleteTask, onSplitTask, onDragStart }: BlockDetailPanelProps) {
    const [tab, seTab] = useState<Tab>("all");

    if(!block){
        return (
            <button type="button" aria-label="Expand block detail panel"
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
                            onClick={onAddTask}
                            className="rounded p-1 hover:bg-white/10"
                        >
                            <ChevronRight size={18} />
                        </button>

                        <button type="button" aria-label="Close panel"
                            className="rounded p-1 hover:bg-white/10"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-slate-200">
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
        </aside>
    )
}