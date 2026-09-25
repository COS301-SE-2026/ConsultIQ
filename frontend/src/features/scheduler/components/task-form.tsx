
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X, Plus, AlertOctagon, AlertTriangle} from 'lucide-react'; 
import  { COMPLEXITY_LABELS, ReasonCode, SCHEDULER_RULES, URGENCY_LABELS,
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
    mode: "create" | "edit";
    initialTask?: Task;
    projects: ProjectOption[];
    expectedVersion: number;
    containerContext?: ContainerContext;
    dependencyOptions?: Pick<Task, "id" | "title">[];
    serverIssues?: Issue[];
    open: boolean;
    onCancel: () => void;
    onSubmit: (submission: TaskSubmission) => Promise<void> ;
}

interface SubtaskDraft {
    id: string;
    title: string;
    estimate: string;
}

const urgencyOptions = Object.keys(URGENCY_LABELS).map(Number) as Urgency[];
const complexityOptions = Object.keys(COMPLEXITY_LABELS).map(Number) as Complexity[];

function createId(): string {
    if(typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `draft-${Math.random().toString(36).substring(2, 10)}`;
}

function toDateInput(value?: string): string {
    return value ? value.slice(0, 10) : "";
}

function toInstant(value: string): string | undefined {
  if (!value) return undefined;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export default function TaskForm({ mode, initialTask, projects, expectedVersion, containerContext, dependencyOptions=[], serverIssues = [], open, onCancel, onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [minHours, setMinHours] = useState(1);
  const [maxHours, setMaxHours] = useState(2);
  const [complexity, setComplexity] = useState<Complexity>(2);
  const [urgency, setUrgency] = useState<Urgency>(2);
  const [deadline, setDeadline] = useState("");
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([]);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if(!open)  return;
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(initialTask?.title ?? "");
    setProjectId(initialTask?.projectId ?? projects[0]?.id ?? "");
    setMinHours(initialTask ? initialTask.tMin / 60 : 1);
    setMaxHours(initialTask ? initialTask.tMax / 60 : 2);
    setComplexity(initialTask?.complexity ?? 2);
    setUrgency(initialTask?.urgency ?? 2);
    setDeadline(toDateInput(initialTask?.deadline));
    setDependsOn(initialTask?.dependsOn ?? []);
    setSubmitError(null);

    setSubtasks(
        initialTask?.subtasks.map((subtask) => ({
            id: subtask.id,
            title: subtask.title,
            estimate: subtask.estimate === undefined ? "" : String(subtask.estimate),
        })) ?? []
    );

  }, [open, initialTask, projects]);

  const tMin= Math.round(minHours * 60);
  const tMax= Math.round(maxHours * 60);

  const localIssues = useMemo<Issue[]>(() => {
    if(!containerContext || !Number.isFinite(tMax)) return [];
    
    const nextIssues: Issue[] = [];
    
    if(tMax > containerContext.availableMinutes) {
        nextIssues.push({
            level: "violation",
            code: ReasonCode.TASK_LARGER_THAN_CONTAINER,
            message: `The maximum estimate exceeds the ${Math.max(containerContext.availableMinutes, 0)} minutes remaining in this project allocation.`,
        });
    }

    const dailyAvailable = Math.max(containerContext.dailyAvailableMinutes, 1);
    const estimatedDaySpan = Math.ceil(tMax / dailyAvailable);

    if(estimatedDaySpan >= SCHEDULER_RULES.maxDaysSpanned && tMax <= containerContext.availableMinutes) {
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

    const canSave = title.trim().length > 0 && projectId.length > 0 && hasValidEstimate && !hasBlockingIssue && !saving;

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

    function buildSubtasks() : Subtask[] {
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

        if(!canSave) return;

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

        try{
            if(mode === "create"){
                await onSubmit({ mode: "create", dto : commonPayload });
            } else if(initialTask){
                await onSubmit({ mode: "edit", taskId: initialTask.id, dto: commonPayload })
            }
        }catch (error) {
            setSubmitError( error instanceof Error ? error.message : "Unable to save task.");
        }finally {
            setSaving(false);
        }
    }

    if(!open) return null;

  return (
    <div className= "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        role="presentation"
        onMouseDown={(e) => { 
            if (e.target === e.currentTarget) { onCancel(); }
        }}
    >
        <form role="dialog" 
            aria-modal="true" 
            aria-labelledby="task-form-title"
            onSubmit = {handleSubmit}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl"
        >
            <header className="flex items-start justify-between bg-slate-900 px-6 py-4 text-white">
                <div className= " flex items-start justify-between bg-slate-900 px-6 py-4 text-white">
                    <h2 id="task-form-title" className="text-base font-semibold">
                        {mode === "create" ? "Create Task" : "Edit Task"}
                    </h2>
                    {activeProject && (
                        <p className="mt-1 text-sm text-slate-300">{activeProject.label} · {activeProject.clientName}</p>
                    )}
                </div>

                <button type="button" aria-label="Close task form"
                onClick={onCancel}
                className= "text-slate-300 hover:text-white">
                    <X size={20} />
                </button>
            </header>

            <div className="space-y-5 overflow-y-auto px-6 py-5">
                <label className= "block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">
                        Task Title
                    </span>
                    <Input value={title} 
                    placeholder="What needs to be done?"
                    autoFocus
                    onChange={(e) => setTitle(e.target.value)} />
                </label>

                <label className= "block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">
                        Project
                    </span>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                        <option value="">Select a project</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.label}
                            </option>
                        ))}
                    </select>
                </label>

               <div className= " grid grid-cols-2 gap-4">
                <label className= "space-y-1.5">
                    <span className= "text-sm font-medium text-slate-700">
                        Minimum Hours
                    </span>
                    <Input type="number" min={0.25} step={0.25} value={minHours} onChange={(e) => setMinHours(Number(e.target.value))} />
                </label>
                <label className= "space-y-1.5">
                    <span className= "text-sm font-medium text-slate-700">
                        Maximum Hours
                    </span>
                    <Input type="number" min={minHours} step={0.25} value={maxHours} onChange={(e) => setMaxHours(Number(e.target.value))} />
                </label>
               </div>
                
                {!hasValidEstimate && (
               <p className= "text-sm text-red-600">
                  Maximum estimate must be greater than or equal to minimum estimate.      
               </p>
                )}

                {isBatched &&(
                    <p className="-mt-3 text-xs text-slate-500">
                        Estimates under {SCHEDULER_RULES.minBlockDuration} minutes will be batched with other short tasks.
                    </p>
                )}

               <ToggleGroup 
                label="Complexity"
                options={complexityOptions}
                value={complexity}
                labels={COMPLEXITY_LABELS}
                onChange={setComplexity}
               />

               <ToggleGroup
                label="Urgency"
                options={urgencyOptions}
                value={urgency}
                labels={URGENCY_LABELS}
                onChange={setUrgency}
               />

               <label className= "block space-y-1.5">
                <span className= "text-sm font-medium text-slate-700">
                    Deadline
                </span>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
               </label>
                
                <section className= "space-y-2">
                    <div className= "flex items-center justify-between">
                        <h3 className= "text-sm font-medium text-slate-700"> Subtasks </h3>
                        <button type="button" 
                        onClick={addSubtask}
                         className = "inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                            <Plus size={14} />
                            Add
                        </button>
                    </div>

                    {subtasks.map((subtask) =>(
                        <div className= "flex items-center gap-2" key={subtask.id}>
                            <Input value={subtask.title}
                            placeholder="Subtask title"
                            onChange={(event) => updateSubtask(subtask.id, { title : event.target.value })}
                            />

                            <Input type="number" min={1} placeholder="Min" value={subtask.estimate}
                            onChange={(event) => updateSubtask(subtask.id, { estimate : event.target.value })}
                            className="w-24"
                            />

                            <button type="button" aria-label="Remove subtask"
                                onClick={() => removeSubtask(subtask.id)}
                                className= "text-slate-400 hover:text-red-600"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}

                    {subtasks.length === 0 && (
                        <p className= "text-sm text-slate-500">No subtasks added.</p>
                    )}
                    </section>

                    {dependencyOptions.length > 0 && (
                        <section className= "space-y-2">
                            <h3 className= "text-sm font-medium text-slate-700">
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
                        <div className= "space-y-2">
                            {issues.map((issue, index) =>(
                                <IssueBanner key={`${issue.code}-${index}`} issue={issue}/>
                            ))}
                        </div>
                    )}

                    {submitError && (
                        <p className="text-sm text-red-600" role="alert">
                            {submitError}
                        </p>
                    )}
                    </div>
                    <footer className= "flex justify-end gap-2 border-t bg-slate-50 px-6 py-4">
                        <button type="button" className= "rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
                            Cancel
                        </button>
                        <button type="submit" className= "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
                            {mode === "create" ? "Create Task" : "Save Changes"}
                        </button>
                    </footer>
        </form>
    </div>
  )}

function ToggleGroup<T extends number>({ label, options, value, labels, onChange }:
    { label: string; options: T[]; value: T; labels: Record<T, string>; onChange: (value: T) => void }) {
        return (
            <div className="space-y-1">
                <span className="text-sm font-medium text-slate-700" >{label}</span>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} >
                    {options.map((option) => (
                        <button key={option} type="button"
                         onClick={() => onChange(option)}
                         className = {`rounded-md border px-3 py-2 text-sm transition-colors 
                            ${value === option ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                            >
                            {labels[option]}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

function IssueBanner({ issue }: { issue: Issue }) {
    const blocking = issue.level === "violation";

    return (
        <div className = {`flex items-start gap-2 rounded-md border px-3 py-2 text-xs 
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