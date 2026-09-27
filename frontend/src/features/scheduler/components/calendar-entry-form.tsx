import { useState } from "react";
import { fromZonedTime } from "date-fns-tz";
import type {
    CalendarEntry,
    CalendarEntryDto,
    CalendarEntryType,
    CalendarTag,
    Issue,

} from "../types/scheduler.types"
import { instantToLocalDate, instantToLocalTime, isOutOfHours } from "../utils/scheduler.utils";
import OutOfHoursConfirmDialog from "./week/out-of-hours-dialog";
import { Card } from "../../../components/ui/card";
import DateField from "../../../components/shared/date-picker";
import { Button } from "../../../components/ui/button";

const TYPE_OPTIONS: { value: CalendarEntryType; label: string }[] = [
    { value: "meeting", label: "Meeting" },
    { value: "lunch", label: "Lunch" },
    { value: "admin", label: "Admin" },
    { value: "training", label: "Training" },
    { value: "travel", label: "Travel" },
    { value: "personal", label: "Personal" },
    { value: "leave", label: "Leave" },
    { value: "adhoc", label: "Ad-hoc" },
    { value: "other", label: "Other" },

]

function toDate(s: string) : Date{
    const [y, m , d] = s.split("-").map(Number);
    return new Date(y, m-1,d); 

}

function toDateString(d: Date): string{
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const labelClass = "text-xs font-semibold text-slate-600";
const inputClass =
    "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002D72]/20";

export interface CalendarEntryFormProps {
    readonly entry?: CalendarEntry,
    readonly timezone: string;
    readonly version: number,
    readonly defaultDate: string;
    readonly issues?: Issue[],
    readonly onSave: (dto: CalendarEntryDto) => void;
    readonly onDelete?: (entryId: string) => void;
    readonly onClose: () => void;
}

export default function CalendarEntryForm({
    entry,
    timezone,
    version,
    defaultDate,
    issues = [],
    onSave,
    onDelete,
    onClose,
}: CalendarEntryFormProps) {
    const isEdit = !!entry;

    const [type, setType] = useState<CalendarEntryType>(entry?.type ?? "meeting");
    const [date, setDate] = useState(entry ? instantToLocalDate(entry.start, timezone) : defaultDate);
    const [startTime, setStartTime] = useState(entry ? instantToLocalTime(entry.start, timezone) : "09:00");
    const [endTime, setEndTime] = useState(entry ? instantToLocalTime(entry.end, timezone) : "10:00");
    const [confirming, setConfirming] = useState(false);

    const weekStart= toDate(defaultDate);
    const weekEnd= new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() +6);


    const weekday = toDate(date).getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const outOfHours = isOutOfHours(startTime, endTime);

    const tags: CalendarTag[] = [];
    if (outOfHours) tags.push("extended-hours");
    if (isWeekend) tags.push("weekend");

    const timeError = endTime <= startTime ? "End time must be after start time." : null;

    function toInstant(time: string) {
        return fromZonedTime(`${date}T${time}:00`, timezone).toISOString();

    }

    function save(confirmedOverride: boolean) {
        onSave({
            id: entry?.id,
            type,
            start: toInstant(startTime),
            end: toInstant(endTime),
            tags,
            origin: "user",
            expectedVersion: version,
            confirmedOverride,
        });
    }

    function handleSave() {
        if (timeError) return;
        if (tags.length > 0) setConfirming(true);
        else save(false);
    }


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
            <Card className="w-[28rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl shadow-xl " onClick={(e) => e.stopPropagation()}>

                <div className="px-6 py-5" style={{backgroundColor: "#002D62"}}>
                    <h2 className="text-base font-bold " style={{ color: "#fff" }}>{isEdit ? "Edit event" : "New event"}</h2>
                    <p className="text-xs  text-white/70 mt-1">Meetings, training, travel, leave and other commitments</p>
                </div>

                
                <div className="px-6 py-5 flex flex-col gap-4">
                <label  className="text-xs text-slate-600 flex flex-col gap-1">
                    Type
                    <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as CalendarEntryType)}>
                        {TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </label>

                <DateField
                    id="entry-day"
                    label="Day"
                    labelClassName={labelClass}
                    selected={toDate(date)}
                    onChange={(d) => d && setDate(toDateString(d))}
                    minDate={weekStart}
                    maxDate={weekEnd}
                />

                {/*Date time range fields */}
                <div className="flex gap-3">
                    <label  className="flex flex-col gap-1.5 flex-1">
                        <span className={labelClass}>Start</span>
                        <input type="time" step={900} className={inputClass} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </label>
                    <label  className="flex flex-col gap-1.5 flex-1">
                        <span className={labelClass}>End</span>
                        <input type="time" step={900} className={inputClass} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </label>
                </div>

                {/*IssueList*/}
                {(timeError || issues.length > 0) && (
                    <ul className="flex flex-col gap-1">
                        {timeError && <li className="text-xs text-red-700">{timeError}</li>}
                        {issues.map((issue, i) => (
                            <li key={i} className={`text-xs ${issue.level === "violation" ? "text-red-700" : "text-amber-700"}`}>
                                {issue.message}
                            </li>
                        ))}
                    </ul>

                )}
                </div>

                {/*Form actions*/}
                <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-2">
                    {isEdit && onDelete && (
                        <Button variant="danger" className="px-3 py-1 text-sm rounded border border-red-200" onClick={() => onDelete(entry.id)}>Delete</Button>
                    )}
                    <div className="flex-1" />
                    <Button variant="outline" className="px-3 py-1 text-sm rounded border border-slate-300" onClick={onClose}>Cancel</Button>
                    <Button
                        className="px-3 py-1 text-sm rounded bg-[#002D62] text-white disabled:opacity-50"
                        disabled={!!timeError}
                        onClick={handleSave}
                    >
                        {isEdit ? "Save" : "Add event"}
                    </Button>

                
                 </div>
                </Card>
                {confirming && (
                    <OutOfHoursConfirmDialog
                        isWeekend={isWeekend}
                        onConfirm={() => save(true)}
                        onCancel={() => setConfirming(false)}
                    />
                )}



            </div>
        
    );



}