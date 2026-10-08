import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { blockTop, CORE_START_TIME, CORE_END_TIME } from "../../utils/scheduler.utils";

interface DayColumnProps {
    readonly date: string;
    readonly isHoliday: boolean;
    readonly children: ReactNode;
    readonly isWeekend?: boolean;
    readonly isPast?: boolean;
}

export default function DayColumn({ date, isHoliday, children, isWeekend = false, isPast = false }: DayColumnProps) {
    const { setNodeRef } = useDroppable({ id: date, disabled: isHoliday || isPast });
    return (
        <div 
            ref={setNodeRef} 
            className={`relative flex-1 min-w-0 border-l border-slate-200 ${isWeekend ? "bg-slate-50" : ""} ${isPast ? "bg-slate-100 opacity-70" : ""}`}
        >
            {!isWeekend && (
                <>
                    <div className="absolute inset-x-0 top-0 bg-slate-50 pointer-events-auto" style={{ height: blockTop(CORE_START_TIME) }} />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-50 pointer-events-auto" style={{ top: blockTop(CORE_END_TIME) }} />
                </>
            )}

            {children}
        </div>
    );
}