import type { Task } from "../types/scheduler.types";   


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

