import type { Task, TaskStatus } from "../types/scheduler.types";   


export const STATUS_LABELS: Record<TaskStatus, string> = {
    Ready: "Ready",
    InProgress: "In Progress",
    Done: "Done"
};

export function getNextStatus(current: TaskStatus) : {status: TaskStatus; label : string} | null {
    const idx = STATUS_ORDER.indexOf(current);
    if (idx === -1 || idx === STATUS_ORDER.length - 1) return null;
    const next = STATUS_ORDER[idx + 1];
    return { status: next, label: STATUS_LABELS[next] };
}

export function formatDuration(minutes: number) : string {
    if (minutes < 60) return `${minutes}m`;

    const hours = minutes / 60;
    return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export function getStartTime(task: Task, timeZone?: string) : string | null {
    const firstSlot = [...task.slots].sort((left, right) => Date.parse(left.start) - Date.parse(right.start))[0];

    if(!firstSlot) return null;

    return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZone
    }).format(new Date(firstSlot.start));
}

export function isOverdue(task: Pick<Task, "deadline" | "status">, now: number): boolean {
  return task.status !== "Done" && Boolean(task.deadline) && Date.parse(task.deadline ?? "") < now;
}

export const STATUS_ORDER: TaskStatus[] = ["Ready", "InProgress", "Done"];

export function ComplexityBars({ level }: { level: Task["complexity"] }) {
    return (
        <span className="inline-flex h-4 items-end gap-0.5"
        role="img"
        aria-label={`Complexity level ${level} of 3`}
        >
            {[1, 2, 3].map((bar) => (
                <span key={bar} 
                    className= {`w-1.5 rounded-sm ${bar <= level ? "bg-amber-500" : "bg-slate-200"}`}
                    style={{ height: `${bar * 4 + 4}px` }}
                />
            ))}
        </span>
    );
}

export function formatEstimateRange ( tMin: number, tMax: number): string {
    return `${formatDuration(tMin)}\u2013${formatDuration(tMax)}`;
}