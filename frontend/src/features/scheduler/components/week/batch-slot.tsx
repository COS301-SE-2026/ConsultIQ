import  { type Slot, type Task, SCHEDULER_RULES  } from "../../types/scheduler.types"

export interface BatchSlotProps{
    slot: Slot;
    tasks: Task[];
    color: string;
    selected?: boolean;
}

export default function BatchSlot({slot, tasks, color, selected= false}:BatchSlotProps){
    const items = tasks.filter((t) => slot.taskIds.includes(t.id));
    const unit= SCHEDULER_RULES.minBlockDuration;
    const total = Math.ceil(items.reduce((sum, t) => sum + t.tMax, 0)/ unit) * unit;

    const textColour = selected ? "rgba(255,255,255,0.9)" : color;
    const mutedColour = selected ? "rgba(255,255,255,0.6)" : "#6B7280";

    return(
        <div
            className="px-1.5 py-1 rounded text-[9px] flex flex-col gap-0.5 overflow-hidden"
            style={{ backgroundColor: selected ? "rgba(255,255,255,0.12)" : color + "12" }}
        >
            <div className="flex justify-between font-medium " style={{ color: textColour }}>
                <span>Quick tasks</span>
                <span>{total / 60}</span>
            </div>
            {items.map((t) => (
                <div key={t.id} className="flex justify-between gap-1" style={{color: mutedColour}}>
                    <span className="truncate">{t.title}</span>
                    <span className="shrink-0">{t.tMax}</span>
                </div>
            ))}
        </div>
    );
}