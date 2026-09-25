/* eslint-disable @typescript-eslint/no-unused-vars */
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
//   const [complexity, setComplexity] = useState<Complexity>(2);
//   const [urgency, setUrgency] = useState<Urgency>(2);
  const [deadline, setDeadline] = useState("");
  const [subtasks, _setSubtasks] = useState<SubtaskDraft[]>([]);
  const [dependsOn, _setDependsOn] = useState<string[]>([]);
//   const [saving, setSaving] = useState(false);
//   const [submitError, setSubmitError] = useState<string | null>(null);


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
            //onSubmit = {handleSubmit}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl"
        >
            <header className="flex items-start justify-between bg-slate-900 px-6 py-4 text-white">
                <div className= " flex items-start justify-between bg-slate-900 px-6 py-4 text-white">
                    <h2 id="task-form-title" className="text-base font-semibold">
                        {mode === "create" ? "Create Task" : "Edit Task"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">Active Project</p>
                </div>

                <button type="button" aria-label="Close task form"
                className= "text-slate-300 hover:text-white">
                    <X size={20} />
                </button>
            </header>

            <div className="space-y-5 overflow-y-auto px-6 py-5">
                <label className= "block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">
                        Task Title
                    </span>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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

               <p className= "text-sm text-red-600">
                  Maximum estimate must be greater than or equal to minimum estimate.      
               </p>

               <label className= "block space-y-1.5">
                <span className= "text-sm font-medium text-slate-700">
                    Deadline
                </span>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
               </label>
                
                <section className= "space-y-2">
                    <div className= "flex items-center justify-between">
                        <h3 className= "text-sm font-medium text-slate-700"> Subtasks </h3>
                        <button type="button" className = "inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                            <Plus size={14} />
                            Add
                        </button>
                    </div>

                    {subtasks.map((subtask) =>(
                        <div className= "flex items-center gap-2" key={subtask.id}>
                            <Input value={subtask.title}
                            //onchange -> update subtask title
                            />

                            <Input type="number" min={1} placeholder="Estimate (hours)" value={subtask.estimate}
                            //onchange -> update subtask estimate
                            />

                            <button type="button" aria-label="Remove subtask"
                                className= "text-slate-400 hover:text-red-600"
                            //onclick -> remove subtask
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
                                        <input type="checkbox" checked={dependsOn.includes(dependency.id)} />
                                          {dependency.title}
                                    </label>
                                ))}
                            </div>
                        </section>
                    )}

                    // issues

                    {/* {submitError && (
                        <p className="text-sm text-red-600" role="alert">
                            {submitError}
                        </p>
                    )} */}
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

