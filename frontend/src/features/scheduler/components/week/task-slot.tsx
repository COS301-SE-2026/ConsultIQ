import type {Slot, Task, TaskStatus} from "../../types/scheduler.types"
import { instantToLocalTime } from "../../utils/scheduler.utils"

export interface TaskSlotProps{
    slot: Slot;
    task: Task;
    timezone: string;
    color: string;
    selected?: boolean;
    onSetStatus?: (taskId: string, status: TaskStatus) => void;

}

function weekday(instant: string, timeZone: string){
    return new Date(instant).toLocaleDateString("en-GB",{weekday: "short", timeZone});
}

export default function TaskSlot({slot, task, timezone, color,selected=false, onSetStatus}: TaskSlotProps){
    const days = [...new Set(
        [...task.slots]
            .sort((a,b) => Date.parse(a.start) - Date.parse(b.start))
            .map((s) => weekday(s.start, timezone)),
    )];

    const thisDay = weekday(slot.start, timezone);

    const textColour = selected ? "rgba(255,255,255,0.9)" : color;
    const mutedColour = selected ? "rgba(255,255,255,0.6)" : "#6B7280";

    function setStatus(e: React.MouseEvent, status: TaskStatus){
        e.stopPropagation();
        onSetStatus?.(task.id, status);
    }

    return(
        <div
            className="px-1.5 py-1 rounded text-[9px] flex flex-col gap-0.5 overflow-hidden"
            style={{ backgroundColor: selected ? "rgba(255,255,255,0.12)" : color + "12" }}
        >

            <div className="flex items-center gap-1">
                <span 
                    className="truncate font-medium flex-1"
                    style={{color: textColour, textDecoration: task.status === "Done" ? "line-through" : "none" }}
                >
                    {task.title}
                </span>

                {slot.locked ? (
                    <span title="Locked">{"\u{1F512}"}</span>
                ):(
                    <>
                        {task.status === "Ready" && (
                            <button onClick={(e) => setStatus(e, "InProgress")} title="Start" style={{ color: textColour }}>{"\u25B6"}</button>
                        )}

                        {task.status === "InProgress" && (
                            <button onClick={(e) => setStatus(e, "Done")} title="Complete" style={{ color: textColour }}>{"\u2713"}</button>
                        )}
                    </>
                )}
            </div>

            <div className="flex items-center justify-between gap-1" style={{ color: mutedColour }}>
                <span>{instantToLocalTime(slot.start, timezone)} - {instantToLocalTime(slot.end, timezone)}</span>
                {days.length > 1 && (
                    <span className="flex gap-1">
                        {days.map((d) => (
                            <span key={d} style={{fontWeight: d === thisDay ? 700 : 400, opacity: d === thisDay ? 1 : 0.5}}>{d}</span>
                        ))}

                    </span>
                )}

            </div>

        </div>
    );


}