import type { CalendarEntry as CalendarEntryData, CalendarEntryType, CalendarTag } from "../../types/scheduler.types";
import {blockTop,blockHeight, instantToLocalTime} from "../../utils/scheduler.utils"

const ENTRY_STYLES: Record<CalendarEntryType, {label: string; bg: string; border: string; text: string }>={
    meeting: {label: "Meeting", bg: "#FFF7ED", border: "#F97316", text: "#9A3412"},
    lunch: {label: "Lunch", bg: "#DCFCE7", border: "#16A34A", text: "#166534"},
    admin: {label: "Admin", bg: "#F1F5F9", border: "#64748B", text: "#334155"},
    training: {label: "Training", bg: "#FEF9C3", border: "#CA8A04", text: "#854D0E"},
    travel: {label: "Travel", bg: "#E0F2FE", border: "#0284C7", text: "#075985"},
    personal: {label: "Personal", bg: "#FCE7F3", border: "#DB2777", text: "#9D174D"},
    holiday: {label: "Public holiday", bg: "#F3F4F6", border: "#9CA3AF", text: "#374151"},
    leave: {label: "Leave", bg: "#F3F4F6", border: "#9CA3AF", text: "#4B5563"},
    adhoc: {label: "Ad-hoc", bg: "#FEE2E2", border: "#DC2626", text: "#991B1B"},
    other: {label: "Other", bg: "#F8FAFC", border: "#94A3B8", text: "475569"},
}

const TAG_LABELS: Record<CalendarTag, string> = {
    "extended-hours" : "Extended hours",
    weekend: "Weekend",
};

export interface CalendarEntryProps{
    entry: CalendarEntryData;
    timezone: string;
    onClick?: () => void;
}

export default function CalendarEntry({entry, timezone, onClick}:CalendarEntryProps){
    const style = ENTRY_STYLES[entry.type];
    const start= instantToLocalTime(entry.start, timezone);
    const end= instantToLocalTime(entry.end, timezone);
    const top = blockTop(start);
    const height = blockHeight(start,end);
    const small= height < 30;

    const editable = entry.origin !== "public-holiday";

    return(
        <div
            onClick= {editable ? onClick : undefined}
            className={`absolute left-0.5 right-0.5 rounded overflow-hidden select-none ${editable ? "cursor-pointer" : "cursor-default"}`}
            style={{
                top,
                height: Math.max(height, 14),
                backgroundColor: style.bg,
                borderLeft: `3px solid ${style.border}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                zIndex:6,
            }}
        >
            <div className={`px-1.5 flex gap-1 overflow-hidden ${small ? "items-center h-full" : "flex-col py-1"}`}>
                <span className="text-[9px] font-semibold truncate" style={{color:style.text}}>
                    {style.label}
                    {!small && <span className="font-normal opacity-70">&middot; {start}-{end} </span>}
                </span>

                {entry.tags.length > 0 &&(
                    <div className="flex gap-0.5 shrink-0">
                        {entry.tags.map((tag) =>(
                            <span
                                key={tag}
                                className="text-[8px] font-bold px-1 rounded"
                                style={{backgroundColor: "#FEF3C7", color:"#92400E"}}
                            >
                                {TAG_LABELS[tag]}
                            </span>
                        ))}

                    </div>
                )}
            </div>
        </div>
    );

}