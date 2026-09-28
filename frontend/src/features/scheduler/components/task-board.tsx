import { useState, type DragEvent } from "react";
import type { SetTaskStatusDto, Task, TaskStatus } from "../types/scheduler.types";
import { STATUS_LABELS, getNextStatus } from "./scheduler-utils";
import TaskCard from "./task-card";
import {type ToggleSubtaskDto} from "../types/scheduler.types"
 
type BoardColumn = "Backlog" | TaskStatus;
 
const COLUMNS: { key: BoardColumn; label: string; dot: string }[] = [
  { key: "Backlog", label: "Backlog", dot: "border-slate-400" },
  { key: "Ready", label: "Ready", dot: "border-blue-500" },
  { key: "InProgress", label: STATUS_LABELS.InProgress, dot: "border-amber-500" },
  { key: "Done", label: "Done", dot: "border-emerald-500" },
];

interface TaskBoardProps {
  readonly tasks: Task[];
  readonly now: number;
  readonly expectedVersion: number;
  readonly subtaskProgressByTaskId: Record<string, { completed: number; total: number }>;
  readonly onEditTask: (task: Task) => void;
  readonly onSetStatus: (taskId: string, dto: SetTaskStatusDto) => void | Promise<void>;
  readonly onToggleSubtask: (taskId: string, subtaskId: string, dto: ToggleSubtaskDto) => void | Promise<void>;
  readonly onSchedule: (taskId: string) => void | Promise<void>;
  readonly onSendToBacklog: (taskId: string) => void | Promise<void>;
  readonly onDelete: (taskId: string) => void | Promise<void>;
  readonly onSplit: (task: Task) => void;
}

function columnFor(task: Task) : BoardColumn{
    return task.placement === "unplaced" ? "Backlog" : task.status;
}

export default function TaskBoard({ tasks, now, expectedVersion, subtaskProgressByTaskId, onEditTask, onSetStatus, onToggleSubtask, onSchedule, onSendToBacklog, onDelete, onSplit }: TaskBoardProps) {
    
    const [dragOverColumn, setDragOverColumn] = useState<BoardColumn | null>(null);
    const byColumn = new Map<BoardColumn, Task[]>(COLUMNS.map((c) => [c.key, []]));
    tasks.forEach((task) => byColumn.get(columnFor(task))?.push(task));
    
    return (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
            <div className="flex h-full gap-4">
                {COLUMNS.map(({ key, label, dot }) => {
                    const columnTasks = byColumn.get(key) ?? [];
                    return (
                        <div key={key}
                            onDragOver={(e) => {e.preventDefault();}}
                            className = {`flex w-72 flex-none flex-col rounded-lg border bg-slate-50 ${
                            dragOverColumn === key ? "border-slate-400 bg-slate-100" : "border-slate-200"}`}
                        >
                            <div className={`flex items-center justify-between border-t-2 px-3 py-2 ${dot}`}>
                                <span className="text-sm font-semibold text-slate-700">{label}</span>
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{columnTasks.length}</span>
                            </div> 

                            <div className="flex-1 space-y-2 overflow-y-auto p-2">
                                {columnTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        now={now}
                                        expectedVersion={expectedVersion}
                                        subtaskProgress={subtaskProgressByTaskId[task.id]}
                                        nextStatus={getNextStatus(task.status) ?? undefined}
                                        onEdit={onEditTask}
                                        onSetStatus={onSetStatus}
                                        onToggleSubtask={onToggleSubtask}
                                        onSendToBacklog={onSendToBacklog}
                                        onDelete={onDelete}
                                        onSplit={onSplit}
                                        onDragStart={(draggedTask, event) => {
                                        event.dataTransfer.setData("text/plain", draggedTask.id);
                                        event.dataTransfer.effectAllowed = "move";
                                        }}
                                    />
                                ))}

                                {columnTasks.length === 0 && (
                                    <p className="pt-4 text-center text-xs text-slate-400">No tasks</p>
                                )}
                            </div>     
                        </div>
                    );
                })}
            </div>
        </div>
    );
}