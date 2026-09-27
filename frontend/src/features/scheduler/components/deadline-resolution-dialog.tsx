import { useState } from "react";
import type { AcceptDeadlineMissDto, Task, UnplacedTaskSummary, UpdateTaskDto } from "../types/scheduler.types";
import { formatDuration } from "./scheduler-utils";

interface DeadlineResolutionDialogProps {
  task: Task;
  summary: UnplacedTaskSummary;
  expectedVersion: number;
  open: boolean;
  onCancel: () => void;
  onExtendDeadline: (taskId: string, dto: UpdateTaskDto) => void | Promise<void>;
  onReduceEstimate: (taskId: string, dto: UpdateTaskDto) => void | Promise<void>;
  onAcceptMiss: (taskId: string, dto: AcceptDeadlineMissDto) => void | Promise<void>;
}

export default function DeadlineResolutionDialog(props: DeadlineResolutionDialogProps){
    if(!props) return null;

    return (
        <DeadlineResolutionDialogContent 
            key={props.task.id}
            {...props}
        />
    );
}

function DeadlineResolutionDialogContent({ task, summary, expectedVersion, onCancel, onExtendDeadline, onReduceEstimate, onAcceptMiss } : DeadlineResolutionDialogProps) {
    const [newDeadline, setNewDeadline] = useState(task.deadline?.slice(0, 10) ?? "");
    const [newMaxHours, setNewMaxHours] = useState(Math.max(0.25, Math.min(task.tMax, summary.availableMinutes) / 60) );

    const newMaxMinutes = Math.round(newMaxHours * 60);
    const canReduceEstimate = Number.isFinite(newMaxMinutes) && newMaxMinutes > 0 && newMaxMinutes < task.tMax && newMaxMinutes <= summary.availableMinutes;

    const shortfall = Math.max(summary.neededMinutes - summary.availableMinutes, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onMouseDown={(event) => {
                if(event.target === event.currentTarget) onCancel();
            }}
        >
            <section className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl"
                role="dialog" aria-modal="true" aria-labelledby="deadline-resolution-title"
            >
                <header className="bg-slate-900 px-6 py-4 text-white">
                    <h2 id="deadline-resolution-title" className="text-base font-semibold">
                        Deadline at risk
                    </h2>
                    <p className="text-sm text-slate-300">{task.title}</p>
                </header>

                <div className="space-y-4 px-6 py-5">
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        <p>Needs {formatDuration(summary.neededMinutes)} minutes, only{" "} {formatDuration(summary.availableMinutes)} minutes available.</p>
                        {shortfall > 0 &&(
                            <p className="mt-1 font-medium">
                                Short by {formatDuration(shortfall)}.
                            </p>
                        )}
                    </div>

                    <section className="space-y-2 rounded-md border border-slate-200 p-3">
                        <h3 className="text-sm font-medium text-slate-800">Extend the deadline</h3>
                        <label className="block">
                            <span className="sr-only"> New deadline </span>
                            <input type="date"
                                value={newDeadline}
                                onChange={(event) => setNewDeadline(event.target.value)}
                            />
                        </label>
                        <button type="button"
                            disabled={!newDeadline}
                            onClick={() => 
                                void onExtendDeadline(task.id, { deadline: new Date(`${newDeadline}T00:00:00.000Z`).toISOString(), expectedVersion})
                            }
                            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Extend
                        </button>
                    </section>
                    
                    <ReduceEstimateOption 
                        maxHours={newMaxHours}
                        maxAllowedMinutes={Math.min(task.tMax, summary.availableMinutes)}
                        canApply={canReduceEstimate}
                        onMaxHoursChange={setNewMaxHours}
                        onApply={() => {
                            void onReduceEstimate(task.id, {tMax: newMaxMinutes, tMin: Math.min(task.tMin, newMaxMinutes), expectedVersion});
                        }}
                    />

                    <AcceptMissOption onAccept={() => void onAcceptMiss(task.id, { expectedVersion })} />
                </div>

                    <footer className="flex justify-end border-t bg-slate-50 px-6 py-4">
                        <button type="button"
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                    </footer>
            </section>
        </div>
    )
}

function ReduceEstimateOption({  maxHours, maxAllowedMinutes, canApply, onMaxHoursChange, onApply}: {
  maxHours: number;
  maxAllowedMinutes: number;
  canApply: boolean;
  onMaxHoursChange: (value: number) => void;
  onApply: () => void;
}){
    return (
        <section className="space-y-2 rounded-md border border-slate-200 p-3">
            <h3 className="text-sm font-medium text-slate-800">
                Reduce the estimate
            </h3>
            <div className="flex items-center gap-2">
                <label className="min-w-0 flex-1">
                    <span className="sr-only"> New maximum estimate in hours </span>
                    <input type="number" min={0.25} step={0.25} max={maxAllowedMinutes/60}
                        value={maxHours}
                        onChange={(e) => onMaxHoursChange(Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                </label>
                <span className="text-sm text-slate-500">hours max</span>
                <button type="button" 
                    disabled={!canApply}
                    onClick={onApply}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Apply
                </button>
            </div>
        </section>
    );
}

function AcceptMissOption({ onAccept }: { onAccept: () => void }){
    return (
        <section className="rounded-md border border-slate-200 p-3">
            <h3 className="text-sm font-medium text-slate-800"> Accept the miss </h3>
            <p className="mt-1 text-xs text-slate-500">Keep the task as-is and acknowledge it will miss its deadline.</p>
            <button type="button"
                className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={onAccept}
            >
                Accept deadline miss
            </button>
        </section>
    );
}