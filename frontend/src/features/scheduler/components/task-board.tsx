import { useState, type DragEvent } from "react";
import type { SetTaskStatusDto, Task, TaskStatus, ToggleSubtaskDto } from "../types/scheduler.types";
import { STATUS_LABELS, getNextStatus } from "./scheduler-utils";
import TaskCard from "./task-card";
import BacklogTaskCard from "./backlog-task-card";

type BoardColumn = "Backlog" | TaskStatus;

const COLUMNS: { key: BoardColumn; label: string; dot: string }[] = [
    { key: "Backlog", label: "Backlog", dot: "border-slate-400" },
    { key: "Ready", label: "Ready", dot: "border-blue-500" },
    { key: "InProgress", label: STATUS_LABELS.InProgress, dot: "border-amber-500" },
    { key: "Done", label: "Done", dot: "border-emerald-500" },
];


interface TaskBoardProject {
    id: string;
    label: string;
    color?: string;
}
interface TaskBoardProps {
    readonly tasks: Task[];
    readonly projects: TaskBoardProject[];
    readonly now: number;
    readonly expectedVersion: number;
    readonly subtaskProgressByTaskId: Record<string, { completed: number; total: number }>;
    readonly onEditTask: (task: Task) => void;
    readonly onSetStatus: (taskId: string, dto: SetTaskStatusDto) => void | Promise<void>;
    readonly onToggleSubtask: (taskId: string, subtaskId: string, dto: ToggleSubtaskDto) => void | Promise<void>;
    readonly onSchedule: (taskId: string) => void | Promise<void>;
    readonly onDeferToNextWeek: (taskId: string) => void | Promise<void>;
    readonly onAcceptDeadlineMiss: (taskId: string) => void | Promise<void>;
    readonly onDelete: (taskId: string) => void | Promise<void>;
    readonly onSplit: (task: Task) => void;
}

function columnFor(task: Task): BoardColumn {
    return task.placement === "unplaced" ? "Backlog" : task.status;
}

export default function TaskBoard({ tasks, projects, now, expectedVersion, subtaskProgressByTaskId, onEditTask, onSetStatus, onToggleSubtask, onSchedule, onDeferToNextWeek, onAcceptDeadlineMiss, onDelete, onSplit }: TaskBoardProps) {
    const [dragOverColumn, setDragOverColumn] = useState<BoardColumn | null>(null);
    const [mobileColumn, setMobileColumn] = useState<BoardColumn>("Ready");
    const [searchQuery, setSearchQuery] = useState("");
    const [projectFilter, setProjectFilter] = useState("all");
    const visibleTasks = tasks.filter((task) => {
        const matchesProject = projectFilter === "all" || task.projectId === projectFilter;
        const matchesSearch = task.title.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase());

        return matchesProject && matchesSearch;
    });

    const byColumn = new Map<BoardColumn, Task[]>(COLUMNS.map((c) => [c.key, []]));
    visibleTasks.forEach((task) => byColumn.get(columnFor(task))?.push(task));

    function handleDrop(target: BoardColumn, event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setDragOverColumn(null);
        const taskId = event.dataTransfer.getData("text/plain");
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const from = columnFor(task);
        if (from === target) return;

        // Tasks only land in the backlog when the scheduler can't place them
        if (target === "Backlog") return;

        if (from === "Backlog") {
            if (target === "Ready") void onSchedule(taskId);
        } else {
            void onSetStatus(taskId, { status: target as TaskStatus, expectedVersion });
        }
    }

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4">
            <div className="mb-3 flex flex-none flex-col gap-2 sm:flex-row">
                <input type="search" aria-label="Search tasks" placeholder="Search tasks"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm"
                />

                <select aria-label="Filter tasks by project"
                    value={projectFilter}
                    onChange={(event) => setProjectFilter(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm sm:w-56"
                >
                    <option value="all">All projects</option>
                    {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                            {project.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Column tabs: phones & tablets only */}
            <div role="tablist" aria-label="Task columns" className="mb-3 flex flex-none gap-1 overflow-x-auto lg:hidden">
                {COLUMNS.map(({ key, label }) => {
                    const count = byColumn.get(key)?.length ?? 0;
                    const active = mobileColumn === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setMobileColumn(key)}
                            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                                active ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-600"
                            }`}
                        >
                            {label}
                            <span className={`rounded-full px-1.5 text-xs ${active ? "bg-white/20" : "bg-slate-100"}`}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* One column at a time below lg, all four side by side from lg up */}
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-4 lg:gap-4">
                    {COLUMNS.map(({ key, label, dot }) => {
                        const columnTasks = byColumn.get(key) ?? [];
                        return (
                            <div key={key}
                                onDragOver={(e) => {
                                    if (key === "Backlog") return; // not a drop target
                                    e.preventDefault();
                                    setDragOverColumn(key);
                                }}
                                onDragLeave={() => setDragOverColumn((c) => (c === key ? null : c))}
                                onDrop={(e) => handleDrop(key, e)}
                                className={`${key === mobileColumn ? "flex" : "hidden"} h-full min-h-0 min-w-0 flex-col rounded-lg border bg-slate-50 lg:flex ${dragOverColumn === key ? "border-slate-400 bg-slate-100" : "border-slate-200"}`}
                            >
                                <div className={`flex items-center justify-between border-t-2 px-3 py-2 ${dot}`}>
                                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{columnTasks.length}</span>
                                </div>

                                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                                    {columnTasks.map((task) => {
                                        if (key === "Backlog") {
                                            const project = projects.find((item) => item.id === task.projectId);
                                            return (
                                                <BacklogTaskCard
                                                    key={task.id}
                                                    task={task}
                                                    projectLabel={project?.label ?? task.projectId}
                                                    projectColor={project?.color ?? "#64748b"}
                                                    now={now}
                                                    expectedVersion={expectedVersion}
                                                    unplacedSummary={
                                                        task.placement === "unplaced" && task.unplacedReason
                                                            ? {
                                                                reason: task.unplacedReason,
                                                                neededMinutes: task.unplacedNeededMinutes,
                                                                availableMinutes: task.unplacedAvailableMinutes,
                                                            }
                                                            : undefined
                                                    }
                                                    onSchedule={onSchedule}
                                                    onSplit={onSplit}
                                                    onResolveDeadline={onEditTask}
                                                    onAcceptDeadlineMiss={onAcceptDeadlineMiss}
                                                    onDeferToNextWeek={(taskId) => onDeferToNextWeek(taskId)}
                                                    onDismiss={onDelete}
                                                    onDragStart={(draggedTask, event) => {
                                                        event.dataTransfer.setData("text/plain", draggedTask.id);
                                                        event.dataTransfer.effectAllowed = "move";
                                                    }}
                                                />
                                            )
                                        }

                                        return (
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
                                                onDelete={onDelete}
                                                onSplit={onSplit}
                                                onDragStart={(draggedTask, event) => {
                                                    event.dataTransfer.setData("text/plain", draggedTask.id);
                                                    event.dataTransfer.effectAllowed = "move";
                                                }}
                                            />
                                        )
                                    })}

                                    {columnTasks.length === 0 && (
                                        <p className="pt-4 text-center text-xs text-slate-400">No tasks</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}