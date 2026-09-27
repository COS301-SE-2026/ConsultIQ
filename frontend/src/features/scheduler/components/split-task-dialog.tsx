import { useMemo, useState } from "react";
import type { SplitTaskDto, Subtask,Task } from "../types/scheduler.types";
import { formatDuration } from "./scheduler-utils";

interface SplitTaskDialogProps{
    task: Task;
    expectedVersion: number;
    open: boolean;
    onCancel: () => void;
    onConfirm: (taskId: string, dto: SplitTaskDto) => void | Promise<void>;
}

const MIN_HALF_MINUTES = 60;
const MIN_TOTAL_MINUTES = MIN_HALF_MINUTES * 2;

interface SubtaskSpan {
  subtask: Subtask;
  start: number;
  end: number;
}

function computeSpans(subtasks: Subtask[]) : SubtaskSpan[] {
  let cursor = 0;

  return subtasks.map((subtask) => {
    const duration = subtask.estimate ?? 0;
    const span = { subtask, start: cursor, end: cursor + duration };

    cursor += duration;
    return span;
  });
}

function getStraddledSubtask(spans: SubtaskSpan[], atMinutes: number) : Subtask | null{
    const span = spans.find((item) => atMinutes > item.start && atMinutes < item.end);

    return span?.subtask ?? null;
}
export default function SplitTaskDialog(props: SplitTaskDialogProps) {
    if(!props) return null;

    return <SplitTaskDialogContent key={props.task.id} {...props} />
}

function SplitTaskDialogContent({ task, expectedVersion, onCancel, onConfirm } : SplitTaskDialogProps){
    const total = task.tMax;
    const disabled = total < MIN_TOTAL_MINUTES || task.status !== "Ready";

    const [atMinutes, setAtMinutes] = useState(() => Math.round(total / 2));


    const spans = useMemo(() => computeSpans(task.subtasks),[task.subtasks]);
    const straddledSubtask = getStraddledSubtask(spans, atMinutes);
    const tooSmall = atMinutes < MIN_HALF_MINUTES ||total - atMinutes < MIN_HALF_MINUTES;
    const invalid = tooSmall || Boolean(straddledSubtask);

    const firstHalf = spans.filter((span) => span.start < atMinutes).map((span) => span.subtask);
    const secondHalf = spans.filter((span) => span.start >= atMinutes).map((span) => span.subtask);

    return(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onMouseDown={(e) => {
                if(e.target === e.currentTarget) onCancel();
            }}
        >
            <section className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl"
                role="dialog" aria-modal="true" aria-labelledby="split-task-title"
            >
                <header className="bg-slate-900 px-6 py-4 text-white">
                    <h2 id="split-task-title" className="text-base font-semibold">
                        Split task
                    </h2>
                    <p className="text-sm text-slate-300">{task.title}</p>
                </header>

                <div className="space-y-4 px-6 py-5">
                    {disabled ? (
                        <p>
                            {total < MIN_TOTAL_MINUTES 
                            ? `This task is too small to split. Each part needs at least ${formatDuration(MIN_HALF_MINUTES)}.`
                            : "This task can only be split while it is Ready."}
                        </p>
                    ): (
                        <>
                        <div className="space-y-2">
                            <label htmlFor="split-slider" 
                                className="text-sm font-medium text-slate-700"
                            >
                                Split point: {formatDuration(atMinutes)} /{" "} {formatDuration(total - atMinutes)}
                            </label>

                            <input id="split-slider" type="range" 
                                min={MIN_HALF_MINUTES} 
                                max={total - MIN_HALF_MINUTES} 
                                step={5}
                                value={atMinutes}
                                onChange={(event) => setAtMinutes(Number(event.target.value))}
                                className="w-full accent-slate-900"
                            />
                        </div>

                        {invalid && (
                            <p className = "text-xs font-medium text-red-600">
                                {straddledSubtask ? `The split falls inside "${straddledSubtask.title}". Move it to a subtask boundary.`
                                : `Each part needs at least ${formatDuration(MIN_HALF_MINUTES)}.`}
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <SplitPreview 
                                label="Part 1"
                                minutes={atMinutes}
                                subtasks={firstHalf}
                            />
                            <SplitPreview 
                                label="Part 2"
                                minutes={total - atMinutes}
                                subtasks={secondHalf}
                            />
                        </div>
                        </>
                    )}
                </div>

                <footer className="flex justify-end gap-2 border-t bg-slate-50 px-6 py-4">
                    <button type="button"
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>

                    <button type="button"
                        disabled={disabled || invalid}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => void onConfirm(task.id, {atMinutes, expectedVersion})}
                    >
                        Split task
                    </button>
                </footer>
            </section>
        </div>
    );
}

function SplitPreview ({label, minutes, subtasks} :{
    label: string;
    minutes: number;
    subtasks: Subtask[];
}){
    return (
        <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">{formatDuration(minutes)}</p>
        
            {subtasks.length > 0 ? (
                <ul className="mt-2 space-y-1">
                    {subtasks.map((subtask) => (
                        <li key={subtask.id} className="text-xs text-slate-600">
                            {subtask.title}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-2 text-xs text-slate-400"> No subtasks </p>
            )}
        </div>
    );
}