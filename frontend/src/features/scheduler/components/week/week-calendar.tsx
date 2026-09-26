import TimeAxis from "./time-axis";
import Dayheader from "./day-header";
import { holidayWeek, FIXTURE_PROJECTS } from "../../types/scheduler.fixtures";
import type { WeekContainer, Interval, TaskStatus } from "../../types/scheduler.types";
import {localDate, instantToLocalDate} from "../../utils/scheduler.utils"
import ProjectBlock from "./project-block";
import { useState } from "react";
import CalendarEntry from "./calendar-entry"

const DAY_Names = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

function addDays(date: string, days: number): string {
    const d= new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0,10);
}



export interface WeekCalendarProps{
    weekData?: WeekContainer;
}

export default function WeekCalendar({weekData=holidayWeek}:WeekCalendarProps){
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [week, setWeek] = useState(weekData);
    const [selectedEntryId, setSelectedEntryId]= useState<string | null>(null);

    function handleResize(blockId : string, to: Interval){
        setWeek((w) => ({
            ...w,
            blocks: w.blocks.map((b) => (b.id === blockId ? { ...b, ...to, userSized: true } : b)),
        }));
    }

    function handleSetStatus(taskId: string, status: TaskStatus){
        setWeek((w) => ({
            ...w,
            tasks: w.tasks.map((t) => (t.id === taskId ? {...t, status} : t)),

        }));
    }
    const days = DAY_Names.map((name,i) => {
        const date = addDays(week.weekStart,i);
        const holiday = week.holidays.find((h) => h.date === date);

        const minutes = week.tasks.flatMap((t) => t.slots)
              .filter((s) => localDate(s.start, week.timezone) === date)
              .reduce((sum,s)=> sum + (Date.parse(s.end) - Date.parse(s.start)) / 60000 , 0);

        return{
            name,
            date,
            isHoliday: !!holiday,
            holidayName: holiday?.name,
            totalHours: minutes / 60,

        };
    });

    return(
        <div className="flex flex-col border border-slate-200">
            <div className="flex border-b border-slate-200">
                <div className="w-16 flex-none" />
                    {days.map((d) =>(
                        <Dayheader
                            key={d.date}
                            dayOfWeek={d.name}
                            date={d.date.slice(8, 10)}
                            isHoliday={d.isHoliday}
                            holidayName={d.holidayName}
                            totalHours={d.totalHours}
                        />
                    ))}
            </div>

            <div className="flex">
                <TimeAxis/>
                {days.map((d) => (
                    <div key={d.date} className="relative flex-1 border-l border-slate-200">
                        {week.blocks
                            .filter((b) => instantToLocalDate(b.start, week.timezone) === d.date)
                            .map((b) => (
                                <ProjectBlock
                                    key={b.id}
                                    block={b}
                                    tasks={week.tasks}
                                    project={FIXTURE_PROJECTS.find((p) => p.id === b.projectId)!}
                                    timezone={week.timezone}
                                    selected={selectedBlockId === b.id}
                                    onClick={()  => setSelectedBlockId(b.id)}
                                    onResize={handleResize}
                                    onSetStatus={handleSetStatus}
                                />
                            ))
                        }

                        {week.entries.filter((e) => instantToLocalDate(e.start,week.timezone) === d.date)
                                    .map((e) =>(
                                        <CalendarEntry
                                            key={e.id}
                                            entry={e}
                                            timezone={week.timezone}
                                            onClick={()=> setSelectedEntryId(e.id)}
                                        />

                                   
                         ))}
                    </div>
                ))}
            </div>
        </div>
            
    );



}