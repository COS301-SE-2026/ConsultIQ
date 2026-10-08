
import { useMemo, useState, type FormEvent } from "react";
import { X, Plus, AlertOctagon, AlertTriangle } from 'lucide-react';
import {
    COMPLEXITY_LABELS, ReasonCode, SCHEDULER_RULES, URGENCY_LABELS,
    type Complexity, type CreateTaskDto, type Issue, type Subtask, type Task,
    type Urgency, type UpdateTaskDto
} from '../types/scheduler.types';
import { Input } from "../../../components/ui/input";

export interface ProjectOption {
    id: string;
    label: string;
    clientName: string;
    color?: string;
}

export interface ContainerContext {
    availableMinutes: number;
    dailyAvailableMinutes: number;
}

export type TaskSubmission = | { mode: "create"; dto: CreateTaskDto } | { mode: "edit"; taskId: string; dto: UpdateTaskDto };

interface TaskFormProps {
    readonly mode: "create" | "edit";
    readonly initialTask?: Task;
    readonly projects: ProjectOption[];
    readonly expectedVersion: number;
    readonly containerContext?: ContainerContext;
    readonly dependencyOptions?: Pick<Task, "id" | "title">[];
    readonly serverIssues?: Issue[];
    readonly open: boolean;
    readonly initialProjectId?: string;
    readonly onCancel: () => void;
    readonly onSubmit: (submission: TaskSubmission) => Promise<void>;
}

interface SubtaskDraft {
    id: string;
    title: string;
    estimate: string;
}

const urgencyOptions = Object.keys(URGENCY_LABELS).map(Number) as Urgency[];
const complexityOptions = Object.keys(COMPLEXITY_LABELS).map(Number) as Complexity[];


let draftIdCounter = 0;

function createId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    draftIdCounter += 1;
    return `draft-${draftIdCounter}`;
}

function toDateInput(value?: string): string {
    return value ? value.slice(0, 10) : "";
}

function todayDateInput(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toInstant(value: string): string | undefined {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default function TaskForm(props: TaskFormProps) {
    if (!props.open) return null;

    const key = `${props.mode}:${props.initialTask?.id ?? "new"}:${props.initialProjectId ?? ""}`;
    return <TaskFormContent key={key} {...props} />;
}

function TaskFormContent({ mode, initialProjectId, initialTask, projects, expectedVersion, containerContext, dependencyOptions = [], serverIssues = [], open, onCancel, onSubmit }: TaskFormProps) {
    const [title, setTitle] = useState(initialTask?.title ?? "");
    const [projectId, setProjectId] = useState(initialTask?.projectId ?? initialProjectId ?? projects[0]?.id ?? "");
    const [minHours, setMinHours] = useState(initialTask ? initialTask.tMin / 60 : 1);
    const [maxHours, setMaxHours] = useState(initialTask ? initialTask.tMax / 60 : 2);
    const [complexity, setComplexity] = useState<Complexity>(initialTask?.complexity ?? 2);
    const [urgency, setUrgency] = useState<Urgency>(initialTask?.urgency ?? 2);
    const [deadline, setDeadline] = useState(toDateInput(initialTask?.deadline));
    const [subtasks, setSubtasks] = useState<SubtaskDraft[]>(initialTask?.subtasks.map((subtask) => ({
        id: subtask.id,
        title: subtask.title,
        estimate:
            subtask.estimate === undefined ? "" : String(subtask.estimate),
    })) ?? []);
    const [dependsOn, setDependsOn] = useState<string[]>(initialTask?.dependsOn ?? []);
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const today = todayDateInput();
    const initialDeadline = toDateInput(initialTask?.deadline);
    // Editing an overdue task may keep its existing deadline; any other choice can't be in the past
    const minDeadline = initialDeadline && initialDeadline < today ? initialDeadline : today;
    const deadlineInPast = deadline !== "" && deadline < today && deadline !== initialDeadline;



    const tMin = Math.round(minHours * 60);
    const tMax = Math.round(maxHours * 60);

    const localIssues = useMemo<Issue[]>(() => {
        if (!containerContext || !Number.isFinite(tMax)) return [];

        const nextIssues: Issue[] = [];

        if (tMax > containerContext.availableMinutes) {
            nextIssues.push({
                level: "violation",
                code: ReasonCode.TASK_LARGER_THAN_CONTAINER,
                message: `The maximum estimate exceeds the ${Math.max(containerContext.availableMinutes, 0)} minutes remaining in this project allocation.`,
            });
        }

        const dailyAvailable = Math.max(containerContext.dailyAvailableMinutes, 1);
        const estimatedDaySpan = Math.ceil(tMax / dailyAvailable);

        if (estimatedDaySpan >= SCHEDULER_RULES.maxDaysSpanned && tMax <= containerContext.availableMinutes) {
            nextIssues.push({
                level: "warning",
                code: ReasonCode.DAY_SPAN_LIMIT_AT_RISK,
                message: `This estimate may span ${estimatedDaySpan} working days and approach the ${SCHEDULER_RULES.maxDaysSpanned}-day limit.`,
            });
        }
        return nextIssues;
    }, [containerContext, tMax]);

    const issues = [...localIssues, ...serverIssues];

    const hasBlockingIssue = issues.some((issue) => issue.code === ReasonCode.TASK_LARGER_THAN_CONTAINER || issue.level === "violation");

    const isBatched = Number.isFinite(tMax) && tMax > 0 && tMax < SCHEDULER_RULES.minBlockDuration;

    const hasValidEstimate = Number.isFinite(minHours) && Number.isFinite(maxHours) && minHours > 0 && maxHours >= minHours;

    const canSave = title.trim().length > 0 && projectId.length > 0 && hasValidEstimate && !deadlineInPast && !hasBlockingIssue && !saving;

    const activeProject = projects.find((project) => project.id === projectId);

    function updateSubtask(id: string, patch: Partial<SubtaskDraft>) {
        setSubtasks((current) => current.map((subtask) => subtask.id === id ? { ...subtask, ...patch } : subtask));
    }

    function addSubtask() {
        setSubtasks((current) => [...current, { id: createId(), title: "", estimate: "" }]);
    }

    function removeSubtask(id: string) {
        setSubtasks((current) => current.filter((subtask) => subtask.id !== id));
    }

    function toggleDependency(id: string) {
        setDependsOn((current) => current.includes(id) ? current.filter((dependencyId) => dependencyId !== id) : [...current, id]);
    }

    function buildSubtasks(): Subtask[] {
        return subtasks.filter((subtask) => subtask.title.trim().length > 0)
            .map((subtask) => {
                const parsedEstimate = Number(subtask.estimate);
                const existingSubtask = initialTask?.subtasks.find((item) => item.id === subtask.id);
                return {
                    id: subtask.id,
                    title: subtask.title,
                    estimate: subtask.estimate && Number.isFinite(parsedEstimate) ? parsedEstimate : undefined,
                    done: existingSubtask?.done ?? false,
                };
            });
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (!canSave) return;

        setSaving(true);
        setSubmitError(null);

        const commonPayload = {
            projectId,
            title: title.trim(),
            tMin,
            tMax,
            deadline: toInstant(deadline),
            urgency,
            complexity,
            subtasks: buildSubtasks(),
            dependsOn,
            expectedVersion,
        };

        try {
            if (mode === "create") {
                await onSubmit({ mode: "create", dto: commonPayload });
            } else if (initialTask) {
                await onSubmit({ mode: "edit", taskId: initialTask.id, dto: commonPayload })
            }
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : "Unable to save task.");
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) { onCancel(); }
            }}
        >
            <form role="dialog"
                aria-modal="true"
                aria-labelledby="task-form-title"
                onSubmit={handleSubmit}
                className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl"
            >
                <header className="flex items-start justify-between bg-primary px-6 py-4 text-white">
                    <div>
                        <h2 id="task-form-title" className="!text-white font-semibold">
                            {mode === "create" ? "Create Task" : "Edit Task"}
                        </h2>
                        {activeProject && (
                            <p className="mt-1 text-sm text-slate-300">{activeProject.label} · {activeProject.clientName}</p>
                        )}
                    </div>

                    <button type="button" aria-label="Close task form"
                        onClick={onCancel}
                        className="text-slate-300 hover:text-white">
                        <X size={20} />
                    </button>
                </header>

                <div className="space-y-5 overflow-y-auto px-6 py-5">
                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-slate-700">
                            Task Title
                        </span>
                        <Input value={title}
                            placeholder="What needs to be done?"
                            autoFocus
                            onChange={(e) => setTitle(e.target.value)} />
                    </label>

                    <label className="flex flex-col space-y-1.5">
                        <span className="text-sm font-medium text-slate-700">
                            Project
                        </span>
                        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                        >
                            <option value="">Select a project</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className=" grid grid-cols-2 gap-4">
                        <label className="space-y-1.5">
                            <span className="text-sm font-medium text-slate-700">
                                Minimum Hours
                            </span>
                            <Input type="number" min={0.25} step={0.25} value={minHours} onChange={(e) => setMinHours(Number(e.target.value))} />
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-sm font-medium text-slate-700">
                                Maximum Hours
                            </span>
                            <Input type="number" min={minHours} step={0.25} value={maxHours} onChange={(e) => setMaxHours(Number(e.target.value))} />
                        </label>
                    </div>

                    {!hasValidEstimate && (
                        <p className="text-sm text-red-600">
                            Maximum estimate must be greater than or equal to minimum estimate.
                        </p>
                    )}

                    {isBatched && (
                        <p className="-mt-3 text-xs text-slate-500">
                            Estimates under {SCHEDULER_RULES.minBlockDuration} minutes will be batched with other short tasks.
                        </p>
                    )}

                    <ToggleGroup
                        label="Complexity"
                        options={complexityOptions}
                        value={complexity}
                        labels={COMPLEXITY_LABELS}
                        variant="complexity"
                        onChange={setComplexity}
                    />

                    <ToggleGroup
                        label="Urgency"
                        options={urgencyOptions}
                        value={urgency}
                        labels={URGENCY_LABELS}
                        variant="urgency"
                        onChange={setUrgency}
                    />

                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-slate-700">
                            Deadline
                        </span>
                        <Input type="date" value={deadline} min={minDeadline} onChange={(e) => setDeadline(e.target.value)} />
                        {deadlineInPast && (
                            <span className="text-xs text-red-600">The deadline can't be in the past.</span>
                        )}
                    </label>

                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-700"> Subtasks </h3>
                            <button type="button"
                                onClick={addSubtask}
                                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                            >
                                <Plus size={14} />
                                Add
                            </button>
                        </div>

                        {subtasks.map((subtask) => (
                            <div className="flex items-center gap-2" key={subtask.id}>
                                <Input value={subtask.title}
                                    placeholder="Subtask title"
                                    onChange={(event) => updateSubtask(subtask.id, { title: event.target.value })}
                                />

                                <Input type="number" min={1} placeholder="Min" value={subtask.estimate}
                                    onChange={(event) => updateSubtask(subtask.id, { estimate: event.target.value })}
                                    className="w-24"
                                />

                                <button type="button" aria-label="Remove subtask"
                                    onClick={() => removeSubtask(subtask.id)}
                                    className="text-slate-400 hover:text-red-600"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}

                        {subtasks.length === 0 && (
                            <p className="text-sm text-slate-500">No subtasks added.</p>
                        )}
                    </section>

                    {dependencyOptions.length > 0 && (
                        <section className="space-y-2">
                            <h3 className="text-sm font-medium text-slate-700">
                                Dependencies
                            </h3>

                            <div className="divide-y rounded-md border border-slate-200">
                                {dependencyOptions.filter((dependency) => dependency.id !== initialTask?.id).map((dependency) => (
                                    <label key={dependency.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                                        <input type="checkbox"
                                            checked={dependsOn.includes(dependency.id)}
                                            onChange={() => toggleDependency(dependency.id)}
                                        />
                                        {dependency.title}
                                    </label>
                                ))}
                            </div>
                        </section>
                    )}

                    {issues.length > 0 && (
                        <div className="space-y-2">
                            {issues.map((issue, index) => (
                                <IssueBanner key={`${issue.code}-${index}`} issue={issue} />
                            ))}
                        </div>
                    )}

                    {submitError && (
                        <p className="text-sm text-red-600" role="alert">
                            {submitError}
                        </p>
                    )}
                </div>
                <footer className="flex justify-end gap-2 border-t bg-slate-50 px-6 py-4">
                    <button type="button" className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                        onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/80">
                        {mode === "create" ? "Create Task" : "Save Changes"}
                    </button>
                </footer>
            </form>
        </div>
    )
}

function ToggleGroup<T extends number>({ label, options, value, labels, variant, onChange }:
    { readonly label: string; readonly options: T[]; readonly value: T; readonly labels: Record<T, string>; variant: "complexity" | "urgency"; onChange: (value: T) => void }) {

    const complexityColors: Record<number, string> = {
        1: "border-emerald-600 bg-emerald-600/10 text-emerald-700",
        2: "border-amber-500 bg-amber-500/10 text-amber-700",
        3: "border-rose-600 bg-rose-600/10 text-rose-700",
    };

    const urgencyColors: Record<number, string> = {
        1: "border-sky-600 bg-sky-600/10 text-sky-700",
        2: "border-yellow-500 bg-yellow-500/10 text-yellow-700",
        3: "border-orange-600 bg-orange-600/10 text-orange-700",
        4: "border-red-700 bg-red-700/10 text-red-700",
    };

    const selectedColors = variant === "complexity" ? complexityColors : urgencyColors;

    return (
        <div className="space-y-1">
            <span className="text-sm font-medium text-slate-700" >{label}</span>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} >
                {options.map((option) => (
                    <button key={option} type="button"
                        onClick={() => onChange(option)}
                        className={`rounded-md border px-3 py-2 text-sm transition-colors 
                            ${value === option ? selectedColors[option]
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                        {labels[option]}
                    </button>
                ))}
            </div>
        </div>
    );
}

function IssueBanner({ issue }: { readonly issue: Issue }) {
    const blocking = issue.level === "violation";

    return (
        <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs 
            ${blocking ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
        >
            {blocking ? (
                <AlertOctagon size={16} className="mt-0.5 shrink-0" />
            ) : (
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            )}
            <span>{issue.message}</span>
        </div>
    );
}