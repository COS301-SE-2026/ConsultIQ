import { useMemo, useState, type DragEvent} from "react";
import { Calendar, ChevronLeft, Plus, Star } from "lucide-react";
import type { DeferToNextWeekDto, Task, UnplacedTaskSummary } from "../types/scheduler.types";
import BacklogTaskCard from "./backlog-task-card";

export interface BacklogProjectOption {
    id: string;
    label: string;
    clientName: string;
    color: string;
}

interface BacklogPanelProps {
    tasks: Task[];
    unplacedSummaries: UnplacedTaskSummary[];
    projects: BacklogProjectOption[];
    now: number;
    expectedVersion: number;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onAddTask: () => void;
    onSchedule: (taskId: string) => void | Promise<void>;
    onResolveDeadline: (task: Task) => void;
    onDeferToNextWeek: (taskId: string, dto: DeferToNextWeekDto) => void | Promise<void>;
    onDismiss: (taskId: string) => void | Promise<void>;
    onDragStart?: (task: Task, event: DragEvent<HTMLButtonElement>) => void;
}
type SortMode = "priority" | "deadline";

function sortTasks(tasks: Task[], mode: SortMode): Task[] {
    return [...tasks].sort((a, b) => {
        if(mode === "priority"){
            return b.urgency - a.urgency;
        }
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return Date.parse(a.deadline) - Date.parse(b.deadline);
    });
}



export default function BacklogPanel({tasks, unplacedSummaries, projects, now, expectedVersion, collapsed, onToggleCollapse, onAddTask, onSchedule, onResolveDeadline, onDeferToNextWeek, onDismiss, onDragStart} : BacklogPanelProps){

    const [activeProject, setActiveProject] = useState<string | "all">("all");
    const [sortMode, setSortMode] = useState<SortMode>("priority");

    const  summaryByTaskId = useMemo(() => {
        const map = new Map<string, UnplacedTaskSummary>();
        unplacedSummaries.forEach((s) => map.set(s.taskId, s));
        return map;
    }, [unplacedSummaries]);

    const projectById = useMemo(() => {
        const map = new Map<string, BacklogProjectOption>();
        projects.forEach((p) => map.set(p.id, p));
        return map;
  }, [projects]);

    const filtered = activeProject === "all" ? tasks : tasks.filter((t) => t.projectId === activeProject);
    
    const unplacedTasks = sortTasks(filtered.filter((t) => summaryByTaskId.has(t.id)), sortMode);
    const normalTasks = sortTasks(filtered.filter((t) => !summaryByTaskId.has(t.id)), sortMode);

    const countFor = (projectId: string | "all") => projectId === "all" ? tasks.length : tasks.filter((t) => t.projectId === projectId).length;

    if(collapsed){
        return (
            <button type="button" aria-label="Expand backlog"
                onClick={onToggleCollapse}
                className="flex h-full w-8 items-center justify-center border-r border-slate-200 bg-slate-50 hover:bg-slate-100"
            >
                <ChevronLeft size={16} className="rotate-180 text-slate-400" />
            </button>
        );
    }

    return (
        <aside className="flex h-full w-[280px] flex-col border-r border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
                <div className="flex items-center gap-2">
                    <button type="button" aria-label="Collapse backlog"
                        onClick={onToggleCollapse}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <h2 className="font-semibold text-slate-900">Backlog</h2>
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">{tasks.length}</span>
                </div>

                <div className="flex items-center gap-1">
                    <button type="button" aria-label="Add task"
                        onClick={onAddTask}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    >
                        <Plus size={16} />
                    </button>

                    <div className="ml-1 flex overflow-hidden rounded border border-slate-200">
                        <button  type="button" aria-label="Sort by priority"
                            onClick={() => setSortMode("priority")}
                            className = {`p-1.5 ${sortMode === "priority" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50"}`}
                        >
                            <Star size={14} />
                        </button>
                        <button type="button" aria-label="Sort by deadline"
                            onClick={() => setSortMode("deadline")}
                            className = {`p-1.5 ${sortMode === "deadline" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50"}`}
                        >
                            <Calendar size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 px-3 py-2">
                <FilterChip label="All" count={countFor("all")} active={activeProject === "all"} onClick={() => setActiveProject("all")} />
                {projects.map((p) => (
                    <FilterChip 
                        key={p.id}
                        label={p.label}
                        count={countFor(p.id)}
                        color={p.color}
                        active={activeProject === p.id}
                        onClick={() => setActiveProject(p.id)}
                    />
                ))}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-3">
                {tasks.length === 0 && <p className="pt-6 text-center text-sm text-slate-400">Backlog is empty.</p>}

                {unplacedTasks.length > 0 && (
                    <section className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700"> Could not be placed ({unplacedTasks.length})</p>
                        {unplacedTasks.map((task) => {
                            const project = projectById.get(task.projectId);
                            return (
                                <BacklogTaskCard
                                    key={task.id} 
                                    task={task}
                                    projectLabel={project?.label ?? task.projectId}
                                    projectColor={project?.color ?? "#64748b"}
                                    unplacedSummary={summaryByTaskId.get(task.id)}
                                    now={now}
                                    expectedVersion={expectedVersion}
                                    onSchedule={onSchedule}
                                    onResolveDeadline={onResolveDeadline}
                                    onDeferToNextWeek={onDeferToNextWeek}
                                    onDismiss={onDismiss}
                                    onDragStart={onDragStart}
                                />
                            );
                        })}
                    </section>
                )}

                {normalTasks.length > 0 && (
                    <section>
                        {normalTasks.map((task) => {
                            const project = projectById.get(task.projectId);
                            return (
                                <BacklogTaskCard
                                    key={task.id} 
                                    task={task}
                                    projectLabel={project?.label ?? task.projectId}
                                    projectColor={project?.color ?? "#64748b"}
                                    now={now}
                                    expectedVersion={expectedVersion}
                                    onSchedule={onSchedule}
                                    onResolveDeadline={onResolveDeadline}
                                    onDeferToNextWeek={onDeferToNextWeek}
                                    onDismiss={onDismiss}
                                    onDragStart={onDragStart}
                                />
                            );
                        })}
                    </section>
                )}
            </div>
        </aside>
    );
}

function FilterChip ({ label, count, active, color, onClick }: {
    label: string;
    count: number;
    active: boolean;
    color?: string;
    onClick: () => void;
}){ 
    return (
        <button type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
            active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
            {color && !active && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
            {label} {count}
        </button>
    );
}
