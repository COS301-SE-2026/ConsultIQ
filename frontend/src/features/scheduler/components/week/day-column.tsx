import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { blockTop } from "../../utils/scheduler.utils";

interface DayColumnProps {
    readonly date: string;
    readonly isHoliday: boolean;
    readonly children: ReactNode;
    readonly isWeekend?: boolean;
}

export default function DayColumn({ date, isHoliday, children, isWeekend = false }: DayColumnProps) {
    const { setNodeRef } = useDroppable({ id: date, disabled: isHoliday });
    return (
        <div ref={setNodeRef} className={`relative flex-1 min-w-0 border-l border-slate-200 ${isWeekend ? "bg-slate-50" : ""}`}>
            {!isWeekend && (
                <>
                    <div className="absolute inset-x-0 top-0 bg-slate-50 pointer-events-auto" style={{ height: blockTop("08:00") }} />
                    <div className="absolute inset-x-0 top-0 bg-slate-50 pointer-events-auto" style={{ top: blockTop("16:00") }} />
                </>
            )}

            {children}
        </div>
    );
}